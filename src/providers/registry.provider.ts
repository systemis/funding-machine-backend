import { Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  IsNotEmpty,
  IsObject,
  IsPort,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';
import { plainToInstance } from 'class-transformer';

import * as fs from 'fs';
import { PlatformConfigEntity } from '../token-metadata/entities/platform-config.entity';

export class SystemConfig {
  /**
   * @description Environment configs
   */
  @IsString()
  @IsNotEmpty()
  NODE_ENV;

  /**
   * @dev the version of current runner
   */
  @IsString()
  API_VERSION: string;

  /**
   * @description PORT and HOST config
   */
  @IsUrl({
    require_protocol: false,
  })
  HOST: string;

  /**
   * @description Port config
   */
  @IsPort()
  @IsNotEmpty()
  PORT: string;

  /**
   * @description Database Config
   */
  // @IsUrl(
  //   { protocols: ['mongodb'], require_tld: false },
  //   {
  //     message: '$property should be a valid MongoDB URL',
  //   },
  // )
  @IsString()
  DB_URL: string;

  // @IsUrl(
  //   { protocols: ['redis'], require_tld: false },
  //   {
  //     message: '$property should be a valid Redis URI',
  //   },
  // )
  @IsString()
  REDIS_URI: string;

  /**
   * @description Other Configs
   */
  @IsString()
  @IsNotEmpty()
  SECRET_TOKEN: string;

  /**
   * @description Operator seed
   */
  @IsString()
  @IsNotEmpty()
  OPERATOR_SECRET_KEY: string;

  // @IsUrl({
  //   require_protocol: false,
  // })
  // DOMAIN: string;

  // @IsUrl({
  //   require_protocol: true,
  // })
  @IsString()
  HOST_URI: string;

  @IsObject()
  NETWORKS: object;

  @IsString()
  SMTP_EMAIL_HOST: string;

  @IsNotEmpty()
  SMTP_EMAIL_PORT: string;

  @IsString()
  SMTP_EMAIL_USERNAME: string;

  @IsString()
  SMTP_EMAIL_PASSWORD: string;

  @IsString()
  SMTP_EMAIL_FROM_EMAIL: string;

  @IsString()
  SMTP_EMAIL_FROM_EMAIL_NAME: string;

  /**
   * @dev Validate schema.
   */
  public ensureValidSchema() {
    /***
     * @dev Validate config schema.
     */
    const errors = validateSync(this);
    /**
     * @dev Raise error if the config isn't valid
     */
    if (errors.length > 0) {
      throw new Error(JSON.stringify(errors.map((elm) => elm.constraints)));
    }
  }
}

@Global()
export class RegistryProvider {
  private static config: SystemConfig;

  constructor() {
    /**
     * @dev Load the config object single time.
     */
    if (!RegistryProvider.config) RegistryProvider.load();
  }

  /**
   * @dev Load config from file.
   */
  private static load() {
    /**
     * @dev Inject config service
     */
    const configService = new ConfigService();

    /**
     * @dev Read credentials file
     */
    const configFilePath = configService.get<string>('CONFIG_FILE', null);
    if (!configFilePath) {
      throw new Error('APPLICATION_BOOT::CONFIG_FILE_NOT_SET');
    }
    const file = fs.readFileSync(configFilePath);

    /**
     * @dev Construct system config
     */
    const data: SystemConfig = {
      /**
       * @dev load API_VERSION from package.json
       */
      API_VERSION: configService.get('npm_package_version', '0.0.0'),
      ...JSON.parse(file.toString()),
    };

    /**
     * @dev Transform config
     */
    RegistryProvider.config = plainToInstance(SystemConfig, data);
    console.log(RegistryProvider.config);
    RegistryProvider.config.ensureValidSchema();

    /**
     * @dev Make config object immutable
     */
    Object.freeze(RegistryProvider.config);
  }

  /**
   * @dev Get the config.
   * @returns System config object.
   */
  public getConfig(): SystemConfig {
    return RegistryProvider.config;
  }

  public getChains(): PlatformConfigEntity {
    return {
      avaxc: {
        wagmiKey: 'avalanche',
        chainName: 'AVAX-C',
        chainLogo:
          'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png?1670992574',
        rpcUrl: this.getConfig().NETWORKS['avaxc'].RPC_URL,
        chainId: this.getConfig().NETWORKS['avaxc'].CHAIN_ID,
        programAddress:
          this.getConfig().NETWORKS['avaxc'].MACHINE_PROGRAM_ADDRESS,
        vaultAddress:
          this.getConfig().NETWORKS['avaxc'].MACHINE_VAULT_PROGRAM_ADDRESS,
        registryAddress:
          this.getConfig().NETWORKS['avaxc'].MACHINE_REGISTRY_PROGRAM_ADDRESS,
        explorerUrl: 'https://snowtrace.io/',
        nativeToken: {
          name: 'Avalanche',
          symbol: 'AVAX',
          decimals: 18,
          logo: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png?1670992574',
        },
        whitelistedRouters: [
          {
            address: '0x60aE616a2155Ee3d9A68541Ba4544862310933d4',
            isV3: false,
            routerVersion: '1',
            ammTag: 'traderjoe',
            ammName: 'TraderJoe',
            dexUrl: 'https://traderjoexyz.com/avalanche/trade',
            inputTag: 'inputCurrency',
            outputTag: 'outputCurrency',
          },
        ],
      },
    };
  }
}
