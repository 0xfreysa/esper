export interface RequestConfig {
  dns: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}

export const requests: Record<string, RequestConfig> = {
  dummy: {
    dns: 'dummyjson.com',
    url: 'https://dummyjson.com/products/1',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      hello: 'world',
      one: 1,
    },
  },
  swapi: {
    dns: 'swapi.dev',
    url: 'https://swapi.dev/api/people/1',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    body: {
      hello: 'world',
      one: 1,
    },
  },
  twitter_profile: {
    dns: 'api.x.com',
    url: 'https://api.x.com/1.1/account/settings.json?include_ext_sharing_audiospaces_listening_data_with_followers=true&include_mention_filter=true&include_nsfw_user_flag=true&include_nsfw_admin_flag=true&include_ranked_timeline=true&include_alt_text_compose=true&ext=ssoConnections&include_country_code=true&include_ext_dm_nsfw_media_filter=true',
    method: 'GET',
    headers: {
      accept: '*/*',
      'accept-language':
        'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-FR;q=0.6,zh-FR;q=0.5,zh;q=0.4,ar-FR;q=0.3,ar;q=0.2',
      authorization:
        'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
      cookie: '',
      dnt: '1',
      origin: 'https://x.com',
      priority: 'u=1, i',
      referer: 'https://x.com/',
      'sec-ch-ua':
        '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'x-client-transaction-id':
        '8bJcp2Wc6qg55CwNDbI1860M+C+hQh8BSxeSXvDbxWtpItZN8w589MSRhPa8j5Pe72PhnvPcCfkcKomHIJbPnoc1A2j48g',
      'x-csrf-token':
        '973e0be66e4b49591fb2475c8fb92ca0943b738898faa61276c31357ed3094b02eda226fb52e2166236683bcd046ce089be090e0ee3bf50f8272f12a3a47f8ec63199b024583f5e49a64a4f618ba28be',
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'en',
    },
  },
  twitter_login: {
    dns: 'api.x.com',
    url: 'https://api.x.com/1.1/help/settings.json?include_zero_rate=true&feature_set_token=c34254773736d750fd311352b336708862ecf6d6&settings_version=7fada87ecd68d5b2e904cbf5d7dad752',
    method: 'GET',
    headers: {
      accept: '*/*',
      'accept-language':
        'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-FR;q=0.6,zh-FR;q=0.5,zh;q=0.4,ar-FR;q=0.3,ar;q=0.2',
      authorization:
        'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
      cookie: '',
      dnt: '1',
      origin: 'https://x.com',
      priority: 'u=1, i',
      referer: 'https://x.com/',
      'sec-ch-ua':
        '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'x-client-transaction-id':
        'zdz5xWCz5kUuKembq56wZi8a0WR8kEj4b975TbzD/BImMwSyw5xxDR0IQxEGh43hRA/eos8169huHc8zBNpDQ3qqZOZgzg',
      'x-csrf-token':
        '8ba1514a1bfc0528522f6bd38edbf9203af724e0dfb628c178c331ed82ee45d70e7bd0eeeff10bfed2d8c991fa0008702369febe127a2a08067ba59d56a6f5fabb108c97469c65587d360da1bc7382d3',
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'en',
    },
  },
  wise_balance: {
    dns: 'wise.com',
    url: 'https://wise.com/gateway/v4/profiles/39893034/balances?types=STANDARD,SAVINGS',
    method: 'GET',
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US',
      cookie: '',
      dnt: '1',
      priority: 'u=1, i',
      referer: 'https://wise.com/home',
      'sec-ch-ua':
        '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
      'sec-ch-ua-arch': '"x86"',
      'sec-ch-ua-bitness': '"64"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-model': '""',
      'sec-ch-ua-platform': '"Linux"',
      'sec-ch-ua-platform-version': '"6.8.0"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'x-access-token': 'Tr4n5f3rw153',
      'x-visual-context': 'personal::light',
    },
  },
  ameli_login: {
    dns: 'assure.ameli.fr',
    url: 'https://assure.ameli.fr/PortailAS/appmanager/PortailAS/assure?_nfpb=true&_pageLabel=as_login_page&connexioncompte_2actionEvt=connecter',
    method: 'GET',
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language':
        'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-FR;q=0.6,zh-FR;q=0.5,zh;q=0.4,ar-FR;q=0.3,ar;q=0.2',
      'Cache-Control': 'max-age=0',
      Connection: 'keep-alive',
      Cookie: '',
      DNT: '1',
      Referer: 'https://ameliconnect.ameli.fr/',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-site',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'sec-ch-ua':
        '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
    },
  },
  linkedin_feed: {
    dns: 'www.linkedin.com',
    url: 'https://www.linkedin.com/feed/',
    method: 'GET',
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language':
        'en-US,en;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-FR;q=0.6,zh-FR;q=0.5,zh;q=0.4,ar-FR;q=0.3,ar;q=0.2',
      'Cache-Control': 'max-age=0',
      Connection: 'keep-alive',
      Cookie: '',
      DNT: '1',
      Priority: 'u=0, i',
      Referer: 'https://www.linkedin.com/checkpoint/lg/login-submit',
      'Sec-CH-UA':
        '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Linux"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    },
  },

  google_personal_info: {
    dns: 'myaccount.google.com',
    url: 'https://myaccount.google.com/personal-info?hl=fr&utm_source=OGB&utm_medium=act',
    method: 'GET',
    headers: {
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'max-age=0',
      Cookie: '',
      DNT: '1',
      Priority: 'u=0, i',
      'Sec-CH-UA':
        '"Not)A;Brand";v="99", "Google Chrome";v="127", "Chromium";v="127"',
      'Sec-CH-UA-Arch': '"x86"',
      'Sec-CH-UA-Bitness': '"64"',
      'Sec-CH-UA-Form-Factors': '"Desktop"',
      'Sec-CH-UA-Full-Version': '"127.0.6533.119"',
      'Sec-CH-UA-Full-Version-List':
        '"Not)A;Brand";v="99.0.0.0", "Google Chrome";v="127.0.6533.119", "Chromium";v="127.0.6533.119"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Model': '""',
      'Sec-CH-UA-Platform': '"Linux"',
      'Sec-CH-UA-Platform-Version': '"6.8.0"',
      'Sec-CH-UA-Wow64': '?0',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    },
  },
};
