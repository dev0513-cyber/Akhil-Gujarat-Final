const urlStr = '%E0%AA%97%E0%AB%8B%E0%AA%A6%E0%AA%BE%E0%AA%B5%E0%AA%B0%E0%AB%80-%E0%AA%A8%E0%AA%A6%E0%AB%80%E0%AA%A8%E0%AB%80-%E0%AA%A6%E0%AB%81%E0%AA%B0%E0%AB%8D%E0%AA%98%E0%AA%9F%E0%AA%A8%E0%AA%BE-%E0%AA%AE%E0%AA%B9%E0%AA%BF%E0%AA%B2%E0%AA%BE%E0%AA%A8%E0%AB%87-%E0%AA%AC%E0%AA%9A%E0%AA%BE%E0%AA%B5%E0%AA%BE%E0%AA%88-%E0%AA%AA%E0%AA%B0%E0%AA%BF%E0%AA%B5%E0%AA%BE%E0%AA%B0%E0%AA%A8%E0%AA%BE-%E0%AA%A4%E0%AB%8D%E0%AA%B0%E0%AA%A3-%E0%AA%B8%E0%AA%AD%E0%AB%8D%E0%AA%AF%E0%AB%8B-%E0%AA%AE%E0%AB%83%E0%AA%A4-%E0%AA%B9%E0%AA%BE%E0%AA%B2%E0%AA%A4%E0%AA%AE%E0%AA%BE%E0%AA%82-%E0%AA%AE%E0%AA%B3%E0%AB%8D%E0%AA%AF%E0%AA%BE-%E0%AA%A4%E0%AB%87%E0%AA%B2%E0%AA%82%E0%AA%97%E0%AA%BE%E0%AA%A3%E0%AA%BE-%E0%AA%9F%E0%AB%81%E0%AA%A1%E0%AB%87';
const decoded = decodeURIComponent(urlStr);
const dbSlug = 'ગોદાવરી-નદીની-દુર્ઘટના-મહિલાને-બચાવાઈ-પરિવારના-ત્રણ-સભ્યો-મૃત-હાલતમાં-મળ્યા-તેલંગાણા-ટુડે';

console.log('Decoded from URL:');
console.log(decoded);
console.log('Match?', decoded === dbSlug);
