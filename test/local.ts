import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join } from 'path';

// Use this script to play around in local deployment

const runLocal = async () => {
  // validator1 from fixture
  const pk =
    '0x1cbc22ce6fae26a6adaf053ad9a06697042251090e6d4881c90bd84956489d2d';
  const signer = new ethers.Wallet(pk);
  const signature = await signer.signMessage('VALIDATOR');
  const auth = ['VALIDATOR', signature].join('::');

  const formData = new FormData();
  const filePath = join(__dirname, './test.jpeg');
  const buffer = readFileSync(filePath);
  const blob = new Blob([buffer], { type: 'image/jpeg' });

  formData.append('file', blob, 'file.jpeg');

  const res = await fetch('http://localhost:3000/w3up/file', {
    method: 'POST',
    headers: {
      authorization: auth,
    },
    body: formData,
  });

  console.log(await res.text());
};

void runLocal();
