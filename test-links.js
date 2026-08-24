const fs = require('fs');

async function check() {
  const res = await fetch('https://akhil-gujarat-final.vercel.app/');
  const text = await res.text();
  const links = text.match(/href="([^"]+)"/g);
  console.log('Links:', Array.from(new Set(links)));
}
check();
