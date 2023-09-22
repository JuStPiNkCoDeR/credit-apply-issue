### Prerequisites
- NodeJS v14.16.1

### Steps to reproduce
#### Install dependencies
```shell
npm install
```

#### Update configuration in the [test file](./src/binance.service.spec.ts)
```ts
// Write configuration here
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
```

#### Execute test command
```shell
npm run test
```