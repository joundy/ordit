import { CollectionRegistrar, mongo } from "../../Services/Mongo";

export const collection = mongo.db.collection<MediaDocument>("media");

export const registrar: CollectionRegistrar = {
  name: "media",
  indexes: [
    [
      {
        outpoint: 1,
      },
    ],
  ],
};

export type MediaDocument = {
  outpoint: string;
  type: string;
  size: number;
  content: string;
};
