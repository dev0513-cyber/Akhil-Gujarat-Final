const baseUrl = 'https://akhil-gujarat-final.vercel.app';
const urls = [
  '/',
  '/news/abcd',
  '/category/gujarat',
  '/category/bharat',
  '/city/vadodara',
  '/city/ahmedabad'
];

async function testCache() {
  for (const url of urls) {
    console.log('\nTesting URL:', url);
    for (let i = 1; i <= 3; i++) {
      const start = Date.now();
      const res = await fetch(baseUrl + url);
      await res.text();
      const latency = Date.now() - start;
      const cacheStatus = res.headers.get('x-vercel-cache') || res.headers.get('x-nextjs-cache') || 'UNKNOWN';
      console.log(`  Req ${i}: ${res.status} | Cache: ${cacheStatus} | Latency: ${latency}ms`);
    }
  }
}
testCache();
