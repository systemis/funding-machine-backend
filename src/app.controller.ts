import { Controller, Get } from '@nestjs/common';

import { PlatformConfigEntity } from './token-metadata/entities/platform-config.entity';
import { RegistryProvider } from './providers/registry.provider';
import { ChainID } from '@/pool/entities/pool.entity';
import { JsonRpcProvider } from '@ethersproject/providers';

@Controller()
export class AppController {
  @Get('/platform-config')
  getConfig(): PlatformConfigEntity {
    return new RegistryProvider().getChains();
  }

  @Get('/platform/ping')
  async ping(): Promise<Record<string, boolean | string>> {
    const chains = new RegistryProvider().getChains();
    const p = await Promise.all(
      Object.keys(chains).map(async (key: ChainID) => {
        const rpc = chains[key].rpcUrl;
        return {
          [key]: await new JsonRpcProvider(rpc)
            .getBlockNumber()
            .then((r) => !!r)
            .catch((e) => e.message),
        };
      }),
    );

    return p.reduce((accum, status) => {
      return {
        ...accum,
        ...status,
      };
    }, {} as Record<string, boolean>);
  }
}
