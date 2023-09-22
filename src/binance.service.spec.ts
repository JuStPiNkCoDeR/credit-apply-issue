/* eslint-disable @typescript-eslint/naming-convention */
import { HttpModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'

import { BinanceService } from './binance.service'

const CONFIGS = (): Record<string, unknown> => ({
    BINANCE_URL: 'https://api.binance.com',
    AXIOS_TIMEOUT: 60000,
    BINANCE_API_KEY: 'key',
    BINANCE_API_SECRET: 'secret',
    PROXY_HOST: 'string',
    PROXY_PORT: 8080,
    PROXY_AUTH: 'string',
    PROXY_ENABLE: false, // no need
})
const DEFAULT_TIMEOUT = 35000
const DEFAULT_MAX_REDIRECTS = 2

describe('BinanceService', () => {
    let binanceService: BinanceService

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ load: [CONFIGS] }),
                HttpModule.registerAsync({
                    imports: [ConfigModule],
                    useFactory: async (configService: ConfigService) => ({
                        baseURL: configService.get(
                            'BINANCE_URL',
                            'https://api.binance.com',
                        ),
                        timeout: +configService.get<number>(
                            'AXIOS_TIMEOUT',
                            DEFAULT_TIMEOUT,
                        ),
                        maxRedirects: configService.get<number>(
                            'AXIOS_MAX_REDIRECTS',
                            DEFAULT_MAX_REDIRECTS,
                        ),
                    }),
                    inject: [ConfigService],
                }),
            ],
            providers: [BinanceService],
        }).compile()

        binanceService = moduleRef.get(BinanceService)
    })

    describe('applyDeposit', () => {
        it('should sign the request', async () => {
            const timestamp = 1695294113617

            let requestUrl

            jest.spyOn(binanceService, 'request').mockImplementation(
                (request) => {
                    requestUrl = request.url
                    return binanceService.request(request)
                },
            )
            jest.spyOn(Date, 'now').mockImplementation(() => timestamp)

            try {
                await binanceService.applyDeposit({
                    subAccountId: '681164088293367800',
                    txId: 'c051d9cdc010f931158c3040a097930f9e520153fc19b7fe51aeb9716c996e59',
                    depositId: 3644705731255021600,
                })
            } catch (error) {
                console.error(error)
            }

            expect(requestUrl).toBe(
                '/sapi/v1/capital/deposit/credit-apply?timestamp=1695294113617&signature=ccafb59cb90f8690c58a6e209a5ef9513bd751018af29eb6f2f853ad5786c09a',
            )
        })

        it.skip('should succeed on the request', async () => {
            expect(
                (
                    await binanceService.applyDeposit({
                        subAccountId: '681164088293367800',
                        txId: 'c051d9cdc010f931158c3040a097930f9e520153fc19b7fe51aeb9716c996e59',
                        depositId: 3644705731255021600,
                    })
                ).success,
            ).toBe(true)
        })
    })
})
