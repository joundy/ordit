import debug from "debug";

import { config } from "../../Config";
import { logger } from "../../Logger";
import { addVins, VinDocument } from "../../Models/Vin";
import { addVouts, setVoutsSpent, SpentVout, VoutDocument } from "../../Models/Vout";
import { isCoinbase, optional, rpc, Vout } from "../../Services/Bitcoin";
import { sanitizeScriptPubKey, sats } from "../../Utilities/Bitcoin";

const log = debug("ordit-indexer:crawler");

const maxBlockHeight = config.crawler.maxBlockHeight;

export async function crawl(blockN: number, maxBlockN: number) {
  if (maxBlockHeight !== 0 && blockN > maxBlockHeight) {
    log("max block height %d reached, terminating...", maxBlockHeight);
    return process.exit(0);
  }

  if (blockN > maxBlockN) {
    return log("crawler caught up with latest block %d, resting...", blockN);
  }

  logger.start();

  const blockHash = await rpc.blockchain.getBlockHash(blockN);
  const block = await rpc.blockchain.getBlock(blockHash, 2);

  // ### Documents

  const vins: VinDocument[] = [];
  const vouts: VoutDocument[] = [];
  const spents: SpentVout[] = [];

  for (const tx of block.tx) {
    let n = 0;
    for (const vin of tx.vin) {
      if (isCoinbase(vin)) {
        continue;
      }
      vins.push({
        blockHash: block.hash,
        blockN: block.height,
        prevTxid: vin.txid,
        ...vin,
        txid: tx.txid,
        n,
      });
      spents.push({
        txid: vin.txid,
        vout: vin.vout,
        location: `${tx.txid}:${n}`,
      });
      n += 1;
    }
    for (const vout of tx.vout) {
      sanitizeScriptPubKey(vout.scriptPubKey);
      vouts.push({
        blockHash: block.hash,
        blockN: block.height,
        txid: tx.txid,
        ...vout,
        sats: sats(vout.value),
        address: await getAddressFromVout(vout),
      });
    }
  }

  const promises = [];

  if (vins.length !== 0) {
    promises.push(addVins(vins));
  }
  if (vouts.length !== 0) {
    promises.push(addVouts(vouts));
  }

  await Promise.all(promises);

  if (spents.length !== 0) {
    await setVoutsSpent(spents);
  }

  // ### Debug
  // Identify any block that takes longer than 1 second to crawl.

  logger.stop();

  if (logger.total > 1) {
    log("crawled block %o", {
      block: blockN,
      txs: block.tx.length,
      vins: vins.length,
      vouts: vouts.length,
      time: logger.total.toFixed(3),
      rpc: [logger.calls.rpc, logger.rpc],
      database: [logger.calls.database, logger.database],
    });
  }

  // printProgress("ordit-indexer", blockN, maxBlockN);
}

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

async function getAddressFromVout(vout: Vout): Promise<string | undefined> {
  if (vout.scriptPubKey.address !== undefined) {
    return vout.scriptPubKey.address;
  }
  if (vout.scriptPubKey.addresses) {
    return vout.scriptPubKey.addresses[0];
  }
  if (vout.scriptPubKey.desc === undefined) {
    return undefined;
  }
  const derived = await rpc.util
    .deriveAddresses(vout.scriptPubKey.desc)
    .catch(optional<string[]>(rpc.util.code.NO_CORRESPONDING_ADDRESS, []));
  return derived[0];
}
