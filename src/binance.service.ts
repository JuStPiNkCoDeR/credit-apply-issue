import * as crypto from 'crypto'

import { HttpException, HttpService, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AxiosRequestConfig, AxiosResponse, Method } from 'axios'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { lastValueFrom } from 'rxjs'

import { ApplyDepositDto } from './dtos/apply-deposit.dto'
import { AppliedDeposit } from './interfaces/applied-deposit.interface'
import * as utils from './shared/helpers/binance.helper'

@Injectable()
export class BinanceService {
    private readonly _baseLogContext = BinanceService.name
    private readonly _logger = new Logger(this._baseLogContext)
    private readonly _binanceApiSecret: string
    private readonly _binanceApiKey: string
    private readonly _recvWindow = 60000
    private readonly _proxyHost: string
    private readonly _proxyPort: string
    private readonly _proxyAuth: string
    private readonly _proxyEnable: string

    constructor(
        private readonly _httpService: HttpService,
        private readonly _configService: ConfigService,
    ) {
        this._binanceApiSecret = this._configService.get<string>(
            'BINANCE_API_SECRET',
            'not found',
        )

        this._binanceApiKey = this._configService.get<string>(
            'BINANCE_API_KEY',
            'not found',
        )

        this._proxyHost = this._configService.get<string>(
            'PROXY_HOST',
            'not found',
        )

        this._proxyPort = this._configService.get<string>(
            'PROXY_PORT',
            'not found',
        )

        this._proxyAuth = this._configService.get<string>(
            'PROXY_AUTH',
            'not found',
        )

        this._proxyEnable = this._configService.get<string>(
            'PROXY_ENABLE',
            'false',
        )
    }

    async request<TResponse>(params: AxiosRequestConfig): Promise<TResponse> {
        try {
            const response = await lastValueFrom<AxiosResponse>(
                this._httpService.request(params),
            )

            // eslint-disable-next-line no-console
            console.log(
                params,
                response.headers['x-mbx-used-weight'] === undefined ||
                    response.headers['x-mbx-used-weight-1m'] === undefined
                    ? response.headers
                    : `'x-mbx-used-weight': ${response.headers['x-mbx-used-weight']} | 'x-mbx-used-weight-1m': ${response.headers['x-mbx-used-weight-1m']} `,
            )
            return response.data
        } catch (error) {
            if (error.response?.headers) {
                // eslint-disable-next-line no-console
                console.log(
                    params,
                    error.response.headers['x-mbx-used-weight'] === undefined ||
                        error.response.headers['x-mbx-used-weight-1m'] ===
                            undefined
                        ? error.response.headers
                        : `'x-mbx-used-weight': ${error.response.headers['x-mbx-used-weight']} | 'x-mbx-used-weight-1m': ${error.response.headers['x-mbx-used-weight-1m']} `,
                )
            }
            if (error.response?.data?.msg) {
                throw new HttpException(
                    error.response.data.msg,
                    error.response.data.code,
                )
            } else if (error.response?.data) {
                throw new HttpException(
                    error.response.data,
                    error.response.data.code,
                )
            } else {
                const statusCode = 500
                throw new HttpException(error.message, statusCode)
            }
        }
    }

    protected async signAndSendRequestWithBody<TResponse>(
        method: Method,
        path: string,
        body = {},
        apiKey?: string,
        secretKey?: string,
        isDifferentArrayFormat = false,
    ): Promise<Promise<TResponse>> {
        const logContext = `${this._baseLogContext}:${this.signAndSendRequestWithBody.name}`

        const clearParams = utils.removeEmptyValue(body)
        const timestamp = Date.now()
        const queryString = utils.buildQueryString(
            {
                timestamp,
            },
            isDifferentArrayFormat,
        )
        const requestBody = utils.buildQueryString({
            ...clearParams,
            recvWindow: this._recvWindow,
        })

        this._logger.debug(
            JSON.stringify({ queryString, requestBody }),
            logContext,
        )

        const signature = crypto
            .createHmac('sha256', secretKey || this._binanceApiSecret)
            .update(`${queryString}${requestBody}`)
            .digest('hex')

        const httpsAgent =
            secretKey && this._proxyEnable === 'true'
                ? new HttpsProxyAgent({
                      host: this._proxyHost,
                      port: this._proxyPort,
                      auth: this._proxyAuth,
                  })
                : undefined
        return await this.request<TResponse>({
            method,
            url: `${path}?timestamp=${timestamp}&signature=${signature}`,
            headers: {
                'Content-Type': 'application/json',
                'X-MBX-APIKEY': apiKey || this._binanceApiKey,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                Accept: 'application/json',
            },
            data: { ...clearParams, recvWindow: this._recvWindow },
            httpsAgent,
        })
    }

    async applyDeposit(payload: ApplyDepositDto): Promise<AppliedDeposit> {
        const logContext = `${this._baseLogContext}:${this.applyDeposit.name}`
        this._logger.debug(
            JSON.stringify({ message: 'Apply deposit requested', payload }),
            logContext,
        )

        const subAccountId = payload.subAccountId
            ? +payload.subAccountId
            : undefined

        const body = { ...payload, subAccountId }

        const response = await this.signAndSendRequestWithBody<AppliedDeposit>(
            'POST',
            '/sapi/v1/capital/deposit/credit-apply',
            body,
        )

        this._logger.debug(
            JSON.stringify({ message: 'Apply deposit response', response }),
            logContext,
        )

        return response
    }
}
