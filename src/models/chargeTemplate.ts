import mongoose from "mongoose";
import { ChargeTemplateSchema } from "../schema/chargeTemplate.schema";

export const ChargeTemplateModel = mongoose.model("portpro", ChargeTemplateSchema, 'portpro');
