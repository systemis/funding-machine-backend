import * as ethers from 'ethers';
import { BigNumber } from 'ethers';

import { RegistryProvider } from '../registry.provider';
import { ChainID } from '../../pool/entities/pool.entity';

import {
  Multicall3,
  Multicall3__factory,
  MachineChef,
  MachineChef__factory,
  MachineRegistry,
  MachineRegistry__factory,
  MachineVault,
  MachineVault__factory,
} from './libs';
import { Types } from './libs/contracts/MachineRegistry';
import { CacheLevel, CacheStorage } from '../cache.provider';

export class EVMBasedMachineProvider {
  private readonly rpcProvider: ethers.providers.JsonRpcProvider;
  private readonly machineRegistry: MachineRegistry;
  private readonly machineVault: MachineVault;
  private readonly machineChef: MachineChef;
  private readonly multicall3: Multicall3;
  private readonly signer: ethers.Wallet;

  /**
   * @dev Constructor that constructs the provider object
   * @param chainId
   */
  constructor(public readonly chainId: ChainID) {
    const registry = new RegistryProvider();

    const {
      INTERNAL_RPC_URL: RPC_URL,
      OPERATOR_SECRET_KEY,
      MACHINE_PROGRAM_ADDRESS,
      MACHINE_REGISTRY_PROGRAM_ADDRESS,
      MACHINE_VAULT_PROGRAM_ADDRESS,
      MULTICALL3_PROGRAM_ADDRESS,
    } = registry.getConfig().NETWORKS[chainId];

    /**
     * @dev Initializes rpc provider
     */
    console.log({
      RPC_URL,
      INTERNAL_RPC_URL: RPC_URL,
      OPERATOR_SECRET_KEY,
      MACHINE_PROGRAM_ADDRESS,
      MACHINE_REGISTRY_PROGRAM_ADDRESS,
      MACHINE_VAULT_PROGRAM_ADDRESS,
      MULTICALL3_PROGRAM_ADDRESS,
    });
    this.rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL);

    /**
     * @dev Initializes variables
     */
    this.signer = new ethers.Wallet(
      OPERATOR_SECRET_KEY as string,
      this.rpcProvider,
    );
    this.multicall3 = Multicall3__factory.connect(
      MULTICALL3_PROGRAM_ADDRESS,
      this.signer,
    );
    this.machineVault = MachineVault__factory.connect(
      MACHINE_VAULT_PROGRAM_ADDRESS,
      this.signer,
    );
    this.machineRegistry = MachineRegistry__factory.connect(
      MACHINE_REGISTRY_PROGRAM_ADDRESS,
      this.signer,
    );
    this.machineChef = MachineChef__factory.connect(
      MACHINE_PROGRAM_ADDRESS,
      this.signer,
    );
  }

  /**
   * @dev Get best fee
   * @param baseTokenAddress
   * @param targetTokenAddress
   * @param ammRouterAddress
   * @param amount
   */
  public async getBestFee(
    baseTokenAddress: string,
    targetTokenAddress: string,
    ammRouterAddress: string,
    amount: BigNumber,
  ): Promise<BigNumber> {
    const cacheKey = `${baseTokenAddress}-${targetTokenAddress}-${ammRouterAddress}-${amount.toString()}`;
    let bestFee = CacheStorage.get(cacheKey, null);

    if (bestFee) {
      return BigNumber.from(bestFee);
    }

    const feeTiers = [100, 500, 3000, 10000];

    /**
     * @dev Get current quotes for fee tiers
     */
    const data = await this.multicall3.callStatic.aggregate3(
      feeTiers.map((fee) => ({
        callData: this.machineVault.interface.encodeFunctionData(
          'getCurrentQuote',
          [
            baseTokenAddress,
            targetTokenAddress,
            ammRouterAddress,
            amount,
            BigNumber.from(fee.toString()),
          ],
        ),
        target: this.machineVault.address,
        allowFailure: true,
      })),
    );

    /**
     * @dev Get best fee
     */
    bestFee = data
      .map((elm, index) => ({
        data:
          elm.success === true
            ? this.machineVault.interface.decodeFunctionResult(
                'getCurrentQuote',
                elm.returnData,
              )
            : null,
        fee: feeTiers[index],
      }))
      .reduce(
        (accum, value) => {
          if (value.data && accum.value.lt(value.data[1])) {
            accum.currentFee = BigNumber.from(value.fee.toString());
            accum.value = value.data[1];
          }

          return accum;
        },
        {
          currentFee: BigNumber.from(0),
          value: BigNumber.from(0),
        },
      );

    CacheStorage.set(cacheKey, bestFee.currentFee.toString(), CacheLevel.HARD);

    return bestFee.currentFee;
  }

  /**
   * @dev Try making DCA swap
   * @param machineId
   */
  public async tryMakingDCASwap(machineId: string) {
    const machineData = await this.machineRegistry.machines(machineId);

    return this.machineChef.tryMakingDCASwap(
      machineId,
      await this.getBestFee(
        machineData.baseTokenAddress,
        machineData.targetTokenAddress,
        machineData.ammRouterAddress,
        machineData.batchVolume,
      ),
      0, // temporarily set slippage to non-slippage
    );
  }

  /**
   * @dev Try closing position
   * @param machineId
   */
  public async tryClosingPosition(machineId: string) {
    const machineData = await this.machineRegistry.machines(machineId);

    return this.machineChef.tryClosingPosition(
      machineId,
      await this.getBestFee(
        machineData.targetTokenAddress,
        machineData.baseTokenAddress,
        machineData.ammRouterAddress,
        machineData.targetTokenBalance,
      ),
      0, // temporarily set slippage to non-slippage
    );
  }

  /**
   * @dev Get quote from blockchain directly
   * @param baseTokenAddress
   * @param targetTokenAddress
   * @param ammRouterAddress
   * @param amount
   * @param fee
   */
  public async getQuote(
    baseTokenAddress: string,
    targetTokenAddress: string,
    ammRouterAddress: string,
    amount: BigNumber,
    fee: BigNumber,
  ): Promise<{ amountIn: BigNumber; amountOut: BigNumber }> {
    const [amountIn, amountOut] =
      await this.machineVault.callStatic.getCurrentQuote(
        baseTokenAddress,
        targetTokenAddress,
        ammRouterAddress,
        amount,
        fee,
      );
    return {
      amountIn,
      amountOut,
    };
  }

  /**
   * @dev Fetch machine including machine data and stop conditions
   * @param id
   */
  public async fetchMachine(id: string) {
    const [{ returnData: machineData }, { returnData: stopConditions }] =
      await this.multicall3.callStatic.aggregate3([
        {
          callData: this.machineRegistry.interface.encodeFunctionData(
            'machines',
            [id],
          ),
          target: this.machineRegistry.address,
          allowFailure: false,
        },
        {
          callData: this.machineRegistry.interface.encodeFunctionData(
            'getStopConditionsOf',
            [id],
          ),
          target: this.machineRegistry.address,
          allowFailure: false,
        },
      ]);

    return {
      machineData: this.machineRegistry.interface.decodeFunctionResult(
        'machines',
        machineData,
      ) as Types.MachineStructOutput,
      stopConditions: this.machineRegistry.interface.decodeFunctionResult(
        'getStopConditionsOf',
        stopConditions,
      )[0] as Types.StopConditionStructOutput[],
    };
  }

  /**
   * @dev Fetch machine including machine data and stop conditions
   * @param idList
   */
  public async fetchMultipleMachines(idList: string[]) {
    const callDataList: Multicall3.Call3Struct[] = [];

    idList.map((machineId) => {
      callDataList.push({
        callData: this.machineRegistry.interface.encodeFunctionData(
          'machines',
          [machineId],
        ),
        target: this.machineRegistry.address,
        allowFailure: false,
      });
      callDataList.push({
        callData: this.machineRegistry.interface.encodeFunctionData(
          'getStopConditionsOf',
          [machineId],
        ),
        target: this.machineRegistry.address,
        allowFailure: false,
      });
    });
    const callResults = await this.multicall3.callStatic.aggregate3(
      callDataList,
    );

    const aggregatedDataList: {
      machineData: Types.MachineStructOutput;
      stopConditions: Types.StopConditionStructOutput[];
    }[] = [];
    idList.map((id, index) => {
      aggregatedDataList[index] = {
        machineData: this.machineRegistry.interface.decodeFunctionResult(
          'machines',
          callResults[index * 2].returnData,
        ) as Types.MachineStructOutput,
        stopConditions: this.machineRegistry.interface.decodeFunctionResult(
          'getStopConditionsOf',
          callResults[index * 2 + 1].returnData,
        )[0] as Types.StopConditionStructOutput[],
      };
    });

    return aggregatedDataList;
  }

  /**
   * @dev Get multiple quotes
   * @param payload
   */
  public async getMultipleQuotes(
    payload: {
      baseTokenAddress: string;
      targetTokenAddress: string;
      ammRouterAddress: string;
      amount: BigNumber;
      fee: BigNumber;
    }[],
  ): Promise<{ amountIn: BigNumber; amountOut: BigNumber }[]> {
    //  Promise<{amountIn: BigNumber, amountOut: BigNumber}[]>
    const callData = payload.map(
      ({
        fee,
        ammRouterAddress,
        baseTokenAddress,
        targetTokenAddress,
        amount,
      }) => ({
        callData: this.machineVault.interface.encodeFunctionData(
          'getCurrentQuote',
          [
            baseTokenAddress || ethers.constants.AddressZero,
            targetTokenAddress || ethers.constants.AddressZero,
            ammRouterAddress,
            amount,
            fee,
          ],
        ),
        target: this.machineVault.address,
        allowFailure: true,
      }),
    );

    const callResults = await this.multicall3.callStatic.aggregate3(callData);

    return callResults.map((result, index) => {
      /**
       * @dev In case any errors happened
       */
      if (result.success === false) {
        return {
          amountIn: payload[index].amount,
          amountOut: BigNumber.from(0),
        };
      }

      const [amountIn, amountOut] =
        this.machineVault.interface.decodeFunctionResult(
          'getCurrentQuote',
          result.returnData,
        );
      return {
        amountIn,
        amountOut,
      };
    });
  }

  /**
   * @dev Fetch events
   * @param fromBlock
   * @param blockDiff
   */
  public async fetchEvents(fromBlock: number, blockDiff: number) {
    const provider = this.rpcProvider;
    const currentBlock = await provider.getBlockNumber();
    const desiredMaxBlock =
      currentBlock > fromBlock + blockDiff
        ? fromBlock + blockDiff
        : currentBlock;

    console.log(fromBlock, desiredMaxBlock);

    const expectedEvents = [
      'MachineUpdated',
      'MachineInitialized',
      'Deposited',
      'Withdrawn',
      'Swapped',
      'ClosedPosition',
    ];

    const registryLogs = await Promise.all(
      (
        await provider.getLogs({
          address: this.machineRegistry.address,
          fromBlock, // default is limited to 5000 block
          toBlock: desiredMaxBlock,
        })
      ).map(async (log) => {
        let extraData;

        try {
          extraData = this.machineRegistry.interface.parseLog(log);
          extraData = {
            ...extraData,
            eventHash: `${log.blockHash}-${log.transactionHash}-${log.transactionIndex}-${log.logIndex}-${extraData.name}`,
          };
        } catch {}

        return {
          transactionHash: log.transactionHash,
          ...extraData,
        };
      }),
    );

    const vaultLogs = await Promise.all(
      (
        await provider.getLogs({
          address: this.machineVault.address,
          fromBlock, // default is limited to 5000 block
          toBlock: desiredMaxBlock,
        })
      ).map(async (log) => {
        let extraData;

        try {
          extraData = this.machineVault.interface.parseLog(log);
          extraData = {
            ...extraData,
            eventHash: `${log.blockHash}-${log.transactionHash}-${log.transactionIndex}-${log.logIndex}-${extraData.name}`,
          };
        } catch {}

        return {
          transactionHash: log.transactionHash,
          ...extraData,
        };
      }),
    );

    console.log({
      registryAddress: this.machineRegistry.address,
      vaultAddress: this.machineVault.address,
    });
    console.log('Fetched logs', registryLogs.length, vaultLogs.length);
    return {
      data: registryLogs
        .concat(vaultLogs)
        .filter((log) => expectedEvents.includes(log.name)),
      syncedBlock: desiredMaxBlock,
    };
  }
}
