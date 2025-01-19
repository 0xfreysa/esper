import Providers from '../../../providers.json';

export const PROVIDERS = Providers;
export const EXPLORER_API = 'https://explorer.tlsnotary.org';
export const MAX_RECV = 16384;
export const MAX_SENT = 4096;

export const NOTARY_API = 'https://notary.freysa.ai:7047';
export const NOTARY_PROXY = 'https://websockify.freysa.ai:55688';

// export const NOTARY_API = 'http://localhost:7047';
// export const NOTARY_PROXY_LOCAL = 'ws://localhost:55688';

export const NOTARY_API_LOCAL = 'http://localhost:7047';
export const NOTARY_PROXY_LOCAL = 'ws://localhost:55688';

export enum Mode {
  Development = 'development',
  Production = 'production',
}

export const MODE: Mode = (process.env.NODE_ENV as Mode) || Mode.Production;

export const EXPECTED_PCRS_DEBUG = {
  '1': 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  '2': 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

// 1 second buffer time to prevent spamming of requests
export const NOTARIZATION_BUFFER_TIME = 60 * 60 * 24; // seconds

export const CONFIG_CACHE_AGE = 600; // seconds

export const VERIFIER_APP_URL = 'https://notary-verifier.freysa.ai/';

export const MOTIVATION_URL =
  'https://framework.freysa.ai/tls-attestations/motivation';

export const POPULAR_PROVIDER_HOSTS = ['x.com', 'reddit.com'];

//NOTE: this is a provisory code attestation for the extension
// to fetch latest code attestation, query https://notary.freysa.ai:80/enclave/attestation?nonce=549bef7ffe5e5e3dd6dd050572b036d8e7e092b7
export const CODE_ATTESTATION =
  'hEShATgioFkRX6lpbW9kdWxlX2lkeCdpLTA3NjY2OTg5OWI5NjAzMjdmLWVuYzAxOTQ3YWI2NDQ2MTM3Y2VmZGlnZXN0ZlNIQTM4NGl0aW1lc3RhbXAbAAABlHt+F6FkcGNyc7AAWDD9rG8KgS3ItlPjuL0Sfl7FPG6pSL1uXnGfb84vlRErlrxg8lDrzNLC7lHMQiWubgsBWDBLTVs2YbPvwSkgkAyA4Sbkzng8Ui3mwCoqW/evOiuTJ7hndvGI5L4cHEBKEp29pJMCWDBOfTFrHSqEdB/txZH7GrFOcVwi6yu8x/qqRwaXFOtsWkm16i7exPF1crYxeyDo3jYDWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEWDDFgj359GdfhdyYSdR240hEtQDQU4whVrwyKH53c2BTbVNk62jHVeDPx83JJHlCIRoFWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPWDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABrY2VydGlmaWNhdGVZAoAwggJ8MIICAaADAgECAhABlHq2RGE3zgAAAABnjCh4MAoGCCqGSM49BAMDMIGOMQswCQYDVQQGEwJVUzETMBEGA1UECAwKV2FzaGluZ3RvbjEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANBV1MxOTA3BgNVBAMMMGktMDc2NjY5ODk5Yjk2MDMyN2YudXMtZWFzdC0xLmF3cy5uaXRyby1lbmNsYXZlczAeFw0yNTAxMTgyMjE3MjVaFw0yNTAxMTkwMTE3MjhaMIGTMQswCQYDVQQGEwJVUzETMBEGA1UECAwKV2FzaGluZ3RvbjEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANBV1MxPjA8BgNVBAMMNWktMDc2NjY5ODk5Yjk2MDMyN2YtZW5jMDE5NDdhYjY0NDYxMzdjZS51cy1lYXN0LTEuYXdzMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEyTDTVtkkuyrlBWgI+btrMShtS0o1zr/mH5g2P4xkRWqe7A0Pf9Ec1pyQj8XHHlHpoc9VmqG68JEuwpM3JNicJoFMPH9sd8B+mCIu6N3BPJYB9PRcMraMvzdBYXXWGldVox0wGzAMBgNVHRMBAf8EAjAAMAsGA1UdDwQEAwIGwDAKBggqhkjOPQQDAwNpADBmAjEAtRHtHVJkrn9nM4EpVvrhvg9Ijj6st5CE3SQ19mlVMLF9oCpJnn/bLkRgMLeJ1CBuAjEA0fPcR673Atb/S9Z9C+yRCjMS0vNCdB0AYKnw+p+lJ+qhFcGQszKm8q/fYXzYz64waGNhYnVuZGxlhFkCFTCCAhEwggGWoAMCAQICEQD5MXVoG5Cv4R1GzLTk5/hWMAoGCCqGSM49BAMDMEkxCzAJBgNVBAYTAlVTMQ8wDQYDVQQKDAZBbWF6b24xDDAKBgNVBAsMA0FXUzEbMBkGA1UEAwwSYXdzLm5pdHJvLWVuY2xhdmVzMB4XDTE5MTAyODEzMjgwNVoXDTQ5MTAyODE0MjgwNVowSTELMAkGA1UEBhMCVVMxDzANBgNVBAoMBkFtYXpvbjEMMAoGA1UECwwDQVdTMRswGQYDVQQDDBJhd3Mubml0cm8tZW5jbGF2ZXMwdjAQBgcqhkjOPQIBBgUrgQQAIgNiAAT8AlTrpgjB82hw4prakL5GODKSc26JS//2ctmJREtQUeU0pLH22+PAvFgaMrexdgcO3hLWmj/qIRtm51LPfdHdCV9vE3D0FwhD2dwQASHkz2MBKAlmRIfJeWKEME3FP/SjQjBAMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFJAltQ3ZBUfnlsOW+nKdz5mp30uWMA4GA1UdDwEB/wQEAwIBhjAKBggqhkjOPQQDAwNpADBmAjEAo38vkaHJvV7nuGJ8FpjSVQOOHwND+VtjqWKMPTmAlUWhHry/LjtV2K7ucbTD1q3zAjEAovObFgWycCil3UugabUBbmW0+96P4AYdalMZf5za9dlDvGH8K+sDy2/ujSMC89/2WQLDMIICvzCCAkSgAwIBAgIQEs+DwFo5xgAjScuxjWVNGTAKBggqhkjOPQQDAzBJMQswCQYDVQQGEwJVUzEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANBV1MxGzAZBgNVBAMMEmF3cy5uaXRyby1lbmNsYXZlczAeFw0yNTAxMTcwMTA3NDVaFw0yNTAyMDYwMjA3NDVaMGQxCzAJBgNVBAYTAlVTMQ8wDQYDVQQKDAZBbWF6b24xDDAKBgNVBAsMA0FXUzE2MDQGA1UEAwwtMTViNTcyNDY3ZDNmMTg1ZS51cy1lYXN0LTEuYXdzLm5pdHJvLWVuY2xhdmVzMHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEDS2CdWBBf2zY7jVWoM9YKJwEYnj77F97+7Fq88TQiS/LbBqv6DZ80SSQZDFECLPJWtU9MudDX61rjDICSZlen7IpRC835DoYqKPAtEUoD73vSp1c/cCF1wwYFVApLn65o4HVMIHSMBIGA1UdEwEB/wQIMAYBAf8CAQIwHwYDVR0jBBgwFoAUkCW1DdkFR+eWw5b6cp3PmanfS5YwHQYDVR0OBBYEFPkQwym+nyYXpxIC+K0iFiMLXXBDMA4GA1UdDwEB/wQEAwIBhjBsBgNVHR8EZTBjMGGgX6BdhltodHRwOi8vYXdzLW5pdHJvLWVuY2xhdmVzLWNybC5zMy5hbWF6b25hd3MuY29tL2NybC9hYjQ5NjBjYy03ZDYzLTQyYmQtOWU5Zi01OTMzOGNiNjdmODQuY3JsMAoGCCqGSM49BAMDA2kAMGYCMQCSjIGeEJiKR/QUeAH0OWJAzXUvIzllBGBha+Ql7zIfUYlAT5mXMqMVqQo37WYu4w0CMQChjmQWBlYYlcDqq4YrFPzAf2ToB95YAYLHIHm1wy9y8NA1q+Wgd39HoTYdCk96UyVZAxkwggMVMIICmqADAgECAhAVIVaAgp0Ex1aTvbmgtDZIMAoGCCqGSM49BAMDMGQxCzAJBgNVBAYTAlVTMQ8wDQYDVQQKDAZBbWF6b24xDDAKBgNVBAsMA0FXUzE2MDQGA1UEAwwtMTViNTcyNDY3ZDNmMTg1ZS51cy1lYXN0LTEuYXdzLm5pdHJvLWVuY2xhdmVzMB4XDTI1MDExODA3MjE1MloXDTI1MDEyMzIyMjE1MlowgYkxPDA6BgNVBAMMM2JhODkxN2Q5Y2ZmYTNmNWMuem9uYWwudXMtZWFzdC0xLmF3cy5uaXRyby1lbmNsYXZlczEMMAoGA1UECwwDQVdTMQ8wDQYDVQQKDAZBbWF6b24xCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJXQTEQMA4GA1UEBwwHU2VhdHRsZTB2MBAGByqGSM49AgEGBSuBBAAiA2IABBk/7zIEqma14s6SgsmKcDJCtvdcWDmpVAjBaAY78vWMbP0el5jMK3Rvhrf1v/1EPMuy/S4mOFcSDOqUcxvR2nsPnatloeIUD8Xmnl63t2Kwl745a51r5pPU8qCivvzlSaOB6jCB5zASBgNVHRMBAf8ECDAGAQH/AgEBMB8GA1UdIwQYMBaAFPkQwym+nyYXpxIC+K0iFiMLXXBDMB0GA1UdDgQWBBSdmgSh94oKlu/i0biK2JfJAefR1zAOBgNVHQ8BAf8EBAMCAYYwgYAGA1UdHwR5MHcwdaBzoHGGb2h0dHA6Ly9jcmwtdXMtZWFzdC0xLWF3cy1uaXRyby1lbmNsYXZlcy5zMy51cy1lYXN0LTEuYW1hem9uYXdzLmNvbS9jcmwvZmJjZGY1M2YtNDJhMC00YWI5LTk1ZTUtYjlkNDY4N2RmNDk4LmNybDAKBggqhkjOPQQDAwNpADBmAjEAwPu/2ebocoDZi0DBCCMHJuobgTODFFwwxK6u/An7tFq920AhyGz8cnz1RGUxEXrWAjEAq8wpng0kRqBGXMcrDT1qJVA10SmCj4j8AqPff8my/tF6aRHM6RP0Q53jbgIZEAP5WQLCMIICvjCCAkWgAwIBAgIVAJ4LvXrssjxtbg5gfSKT5v30H0QwMAoGCCqGSM49BAMDMIGJMTwwOgYDVQQDDDNiYTg5MTdkOWNmZmEzZjVjLnpvbmFsLnVzLWVhc3QtMS5hd3Mubml0cm8tZW5jbGF2ZXMxDDAKBgNVBAsMA0FXUzEPMA0GA1UECgwGQW1hem9uMQswCQYDVQQGEwJVUzELMAkGA1UECAwCV0ExEDAOBgNVBAcMB1NlYXR0bGUwHhcNMjUwMTE4MTAyMTU1WhcNMjUwMTE5MTAyMTU1WjCBjjELMAkGA1UEBhMCVVMxEzARBgNVBAgMCldhc2hpbmd0b24xEDAOBgNVBAcMB1NlYXR0bGUxDzANBgNVBAoMBkFtYXpvbjEMMAoGA1UECwwDQVdTMTkwNwYDVQQDDDBpLTA3NjY2OTg5OWI5NjAzMjdmLnVzLWVhc3QtMS5hd3Mubml0cm8tZW5jbGF2ZXMwdjAQBgcqhkjOPQIBBgUrgQQAIgNiAAT9v5dkwE2b0i2MqnUU0lX6wYdGIbaI/U9+TQn4TEUUxCr6NrPjaXf1rXvJW28j/rTmJEPsPireCn2j7fh45NVxxIntVB9KuK8RfVhiBerVQJwsUkads35yYJxfsiqNGmajZjBkMBIGA1UdEwEB/wQIMAYBAf8CAQAwDgYDVR0PAQH/BAQDAgIEMB0GA1UdDgQWBBSVnMeZ+InhpwZBN01RTtqbkGgIIDAfBgNVHSMEGDAWgBSdmgSh94oKlu/i0biK2JfJAefR1zAKBggqhkjOPQQDAwNnADBkAjB0MWVmzshKNae985fh/D4PluBZQBFztYXRUF+Ub/2rAFuntPoaivW1qIfZTwLir4QCMAmyrigwoD9utGrXbQIjX3xg2FZ1F1R/pCYHYeBFMOFYqZklOZUShGiM22jEZm1F0mpwdWJsaWNfa2V5RWR1bW15aXVzZXJfZGF0YVhEEiCcvbsJYt/4y81zB5GTtp6wlwXEr325Z2xELvEK1tWZvBIgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABlbm9uY2VUVJvvf/5eXj3W3QUFcrA22OfgkrdYYLqCpr26zCc2K5FdVqAzPdlOVjTvgAhEDMd8ib2MVDocG9zqUqBkY+scq38ZB74QN9x1zOpZKGNGhtG6DBNXLMnQwmG6aOFyUxb2hMM6Tz6rbVBXfUHQPQGmbUbVAm0axg==';
