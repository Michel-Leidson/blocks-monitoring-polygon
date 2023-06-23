require('dotenv').config();
const { default: axios } = require('axios');
const { exec } = require('child_process');

const MATIC_VALIDATOR_ID = process.env.MATIC_VALIDATOR_ID;
const BACKEND_API = process.env.BACKEND_API;

async function collectHeimdallBlock() {
  await exec('tail -n 1000 /var/log/syslog | grep "new block" | tail -1', (error, stdout, stderr) => {
    if (error) {
      console.error(`error: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    axios.get("https://heimdall-api.polygon.technology/blocks/latest").then(response => {
      console.log("Last Network block Heimdal", response.data.block_meta.header.height);
      const LAST_BLOCK_NETWORK_HEIMDALL = response.data.block_meta.header.height;

      if (typeof LAST_BLOCK_NETWORK_HEIMDALL !== "undefined" && typeof stdout !== 'undefined' && stdout !== '') {
        try {
          console.log("Output command:", stdout);
          let output = stdout.split(" Sending new block to ethstats, number :");

          const block = output[1].trim();
          const timestamp = new Date().toISOString();
          let block_missed = parseInt(LAST_BLOCK_NETWORK_HEIMDALL) - parseInt(block);
          if(block_missed < 0){
            block_missed = 0;
          }
          let outputStringJson = `{"matic_id":"${MATIC_VALIDATOR_ID}","type":"heimdall" ,"missed_blocks": ${block_missed} }`;
          let outputJson = JSON.parse(outputStringJson);
          console.log(outputJson);
          axios.post(`${BACKEND_API}/blocks/heimdall`, outputJson).then(response => {
            console.log(new Date().toISOString(), ":", "Response", response.data);
          }).catch(err => {
            console.log(err)
          })
        } catch (err) {
          console.log(new Date().toISOString(), "Error:", err.message, err)
        }
      }
    }).catch(err => {
      console.log(err);
    })

  });
}

async function collectBorBlock() {
  await exec('tail -n 1000 /var/log/syslog | grep "Imported new chain" | tail -1', (error, stdout, stderr) => {
    if (error) {
      console.error(`error: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }
    axios.post('https://polygon-rpc.com/',{
      "jsonrpc":"2.0",
      "method":"eth_blockNumber",
      "params":[
         
      ],
      "id":83
   }).then(response => {

      const LAST_BLOCK_NETWORK_BOR = parseInt(response.data.result,16);
      console.log("Last block Bor in network", LAST_BLOCK_NETWORK_BOR);
      if (typeof LAST_BLOCK_NETWORK_BOR !== "undefined" && typeof stdout !== 'undefined' && stdout !== '') {
        try {
          console.log("Output command:", stdout);
          let output = stdout.split("Imported new chain segment")[1].trim().split("number=")[1].trim().split("hash=")[0].trim();

          const block = output.replaceAll(",", "");
          console.log("Collected Bor block:", block);
          const timestamp = new Date().toISOString();
          let block_missed = LAST_BLOCK_NETWORK_BOR - parseInt(block);
          if(block_missed < 0){
            block_missed = 0;
          }
          let outputStringJson = `{"matic_id":"${MATIC_VALIDATOR_ID}","type":"bor" ,"missed_blocks": ${parseInt(block_missed)} }`;
          let outputJson = JSON.parse(outputStringJson);
          axios.post(`${BACKEND_API}/blocks/bor`, outputJson).then(response => {
            console.log(new Date().toISOString(), ":", "Response", response.data);
          }).catch(err => {
            console.log(err)
          })
          console.log(outputJson);
        } catch (err) {
          console.log(new Date().toISOString(), "Error:", err.message, err)
        }
      }
    }).catch(err => {
      console.log(err);
    })

  });
}

setInterval(() => {
  collectHeimdallBlock();
  collectBorBlock();
}, 5000);
