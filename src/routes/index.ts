import { Router } from "express";
import { getRuleBasedCharges, getRuleBasedChargesForLocation, getVendorsFromRouting } from "../utils/utils";

const router = Router();

router.post("/chargeTemplates", async (req, res) => {
  try {
    let additionalInfo: any = req?.body?.additionalInfo;

    additionalInfo.vendorList = getVendorsFromRouting(req?.body?.loadInfo?.driverOrder, "driver");

    const fetchMultiRulesChargesFromProfileGroup: any = await getRuleBasedCharges(
      req?.body?.loadInfo?.driverOrder,
      additionalInfo,
    );

    const fetchedMultiLocationCharges: any = await getRuleBasedChargesForLocation(
      req?.body?.loadInfo?.driverOrder,
      additionalInfo,
    );

    return res.json({ data: [...fetchMultiRulesChargesFromProfileGroup, ...fetchedMultiLocationCharges] });
  } catch (error: any) {
    res.status(500).json({ error: error?.message });
  }
});

export default router;
