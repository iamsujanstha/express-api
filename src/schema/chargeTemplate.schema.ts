// src/schema/chargeTemplate.schema.ts
import mongoose, { Schema } from "mongoose";
import { ProfileType } from "../constants/constants";

export const ChargeTemplateSchemaBase = {
  name: { type: String, required: true },
  description: { type: String, required: false },
  unitOfMeasure: { type: String, required: true },
  owner: { type: String, required: true },
  systemGenerated: { type: Boolean, required: true },
  rules: { type: [Schema.Types.Mixed], required: false },
  charges: { type: [Schema.Types.Mixed], required: true }, // Adjusted for example
  isActive: { type: Boolean, required: true },
  autoAdd: { type: Boolean, default: true },
  fromEvent: { type: Schema.Types.Mixed, required: false }, // Adjusted for example
  toEvent: { type: [Schema.Types.Mixed], required: false }, // Adjusted for example
  inEvent: { type: Schema.Types.Mixed, required: false }, // Adjusted for example
  exactEvents: { type: [], required: false },
  chargeTemplateGroupID: { type: [mongoose.Types.ObjectId], required: false },
  isDeleted: { type: Boolean, required: true, default: false },
  version: { type: Number, required: true, default: 1 },
  effectiveDateParameter: { type: String, required: false },
  chargeName: { type: String, required: true },
  chargeCode: { type: String, required: true },
  percentageOf: { type: [String], required: false },
  vendor: { type: Schema.Types.Mixed, required: false }, // Adjusted for example
  chargesBasedOn: { type: String, required: false, default: undefined },
  eventLocationRule: { type: Schema.Types.Mixed, required: false, default: undefined }, // Adjusted for example
  eventLocationRules: { type: [Schema.Types.Mixed], required: false, default: undefined }, // Adjusted for example
  vendorId: { type: mongoose.Types.ObjectId, required: false, default: undefined },
  vendorProfileType: { type: String, enum: Object.values(ProfileType), required: false, default: undefined },
  multiQueryIndex: { type: [String], required: false, default: undefined },
  singleQueryIndex: { type: String, required: false, default: undefined },
  fromLegs: [{ type: String, trim: true, required: false, default: undefined }],
  fromProfileType: { type: String, required: false, default: undefined },
  from: {
    zipCode: { type: String, required: false, default: undefined, trim: true },
    cityState: { type: String, required: false, default: undefined, trim: true },
    profile: { type: mongoose.Schema.ObjectId, required: false, default: undefined },
    profileGroup: { type: String, required: false, default: undefined },
    cityStateGroup: { type: mongoose.Schema.ObjectId, required: false, default: undefined },
    zipCodeGroup: { type: mongoose.Schema.ObjectId, required: false, default: undefined },
  },
  fromProfile: { type: Schema.Types.Mixed, required: false, default: undefined }, // Adjusted for example
  toLegs: [{ type: String, trim: true, required: false, default: undefined }],
  toProfileType: { type: String, required: false, default: undefined },
  to: {
    zipCode: { type: String, required: false, default: undefined, trim: true },
    cityState: { type: String, required: false, default: undefined, trim: true },
    profile: { type: mongoose.Schema.ObjectId, required: false, default: undefined },
    profileGroup: { type: String, required: false, default: undefined },
    cityStateGroup: { type: mongoose.Schema.ObjectId, required: false, default: undefined },
    zipCodeGroup: { type: mongoose.Schema.ObjectId, required: false, default: undefined },
  },
  toProfile: { type: Schema.Types.Mixed, required: false, default: undefined }, // Adjusted for example
  moveType: { type: String, required: false, default: undefined },
};

export const ChargeTemplateSchema = new Schema<any>(ChargeTemplateSchemaBase, {
  timestamps: true,
  versionKey: false,
});
