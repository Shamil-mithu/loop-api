const fs = require('fs');
const { PKPass } = require('passkit-generator');
const { createPassJsonForAppleWallet } = require('@src/utils');


const createPass = async (customer, existingPass = null) => {
  try {
    const signerCert = fs.readFileSync('./apple-vas-certificates/signerCert.pem');
    const signerKey = fs.readFileSync('./apple-vas-certificates/signerkey.pem');
    const wwdr = fs.readFileSync('./apple-vas-certificates/wwdr.pem');
    const p12Password = 'mithu';

    const passJson = await createPassJsonForAppleWallet(customer, existingPass);
    const pass = await PKPass.from({
      model: './passModel/custom.pass',
      certificates: {
        wwdr,
        signerCert,
        signerKey,
        signerKeyPassphrase: p12Password,
      },
    });
    const buffer = pass.getAsBuffer();

    return { buffer, passJson };
  } catch (err) {
    console.error('Error generating pass:', err);
    throw err;
  }
};

module.exports = createPass;
