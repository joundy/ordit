import { AnyBulkWriteOperation, Filter, FindOptions } from "mongodb";

import { config } from "../../Config";
import { getMetaFromTxId } from "../../Utilities/Oip";
import { collection, Inscription } from "./Collection";

export const inscriptions = {
  collection,

  // ### Core Methods

  insertMany,
  insertOne,
  find,
  findOne,
  count,

  // ### Helper Methods

  hasInscriptions,
  getInscriptionById,
  getInscriptionsByOutpoint,
};

/*
 |--------------------------------------------------------------------------------
 | Core Methods
 |--------------------------------------------------------------------------------
 |
 | Flexible core mongodb methods for the collection. These methods provides a 
 | unified passthrough to the collection directly for querying.
 |
 */

async function insertMany(inscriptions: Inscription[], chunkSize = 1000) {
  if (inscriptions.length === 0) {
    return;
  }
  const bulkops: AnyBulkWriteOperation<Inscription>[] = [];
  for (const inscription of inscriptions) {
    bulkops.push({
      updateOne: {
        filter: { id: inscription.id },
        update: {
          $set: inscription,
        },
        upsert: true,
      },
    });
    if (bulkops.length === chunkSize) {
      await collection.bulkWrite(bulkops);
      bulkops.length = 0;
    }
  }
  if (bulkops.length > 0) {
    await collection.bulkWrite(bulkops);
  }
}

async function insertOne(inscription: Inscription) {
  return collection.updateOne({ id: inscription.id }, { $set: inscription }, { upsert: true });
}

async function find(filter: Filter<Inscription>, options?: FindOptions<Inscription>) {
  return collection.find(filter, options).toArray();
}

async function findOne(
  filter: Filter<Inscription>,
  options?: FindOptions<Inscription>
): Promise<Inscription | undefined> {
  const output = await collection.findOne(filter, options);
  if (output === null) {
    return undefined;
  }
  return output;
}

async function count(filter: Filter<Inscription>) {
  return collection.countDocuments(filter);
}

/*
 |--------------------------------------------------------------------------------
 | Helper Methods
 |--------------------------------------------------------------------------------
 |
 | List of helper methods for querying more complex data from the collection. 
 | These methods provides a wrapper around core functionality and produces results 
 | under deterministic filters.
 |
 */

async function hasInscriptions(txid: string, n: number) {
  return (await collection.countDocuments({ outpoint: `${txid}:${n}` })) > 0;
}

async function getInscriptionById(id: string) {
  const inscription = await collection.findOne({ id });
  if (inscription === null) {
    return undefined;
  }
  const meta = await getMetaFromTxId(inscription.genesis);
  if (meta !== undefined) {
    inscription.meta = meta;
  }
  inscription.mediaContent = `${config.api.domain}/content/${inscription.id}`;
  return inscription;
}

async function getInscriptionsByOutpoint(outpoint: string) {
  const inscriptions = await collection.find({ outpoint }).toArray();
  for (const inscription of inscriptions) {
    const meta = await getMetaFromTxId(inscription.genesis);
    if (meta !== undefined) {
      inscription.meta = meta;
    }
    inscription.mediaContent = `${config.api.domain}/content/${inscription.id}`;
  }
  return inscriptions;
}
