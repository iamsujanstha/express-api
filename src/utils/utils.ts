import { Types } from "mongoose";
import { ProfileType, VendorTypes } from "../constants/constants";
import { ChargeTemplateModel } from "../models/chargeTemplate";
import _ from "lodash";

export const queryForVendorValidityCheck = (payloadData: any): any => {
  const { owner, groupIds, vendorList, vendorType } = payloadData;
  let criteria: any = {
    owner,
    isDeleted: { $ne: true },
    chargeTemplateGroupID: { $in: [new Types.ObjectId("66729ed844d8b882ea14817c")] },
  };

  if (vendorType === VendorTypes.DRIVER) {
    criteria = {
      ...criteria,
      $or: [
        {
          vendorProfileType: {
            $in: [vendorType, ProfileType.DRIVER_GROUP],
          },
          vendorId: {
            $in: [...(vendorList ?? []), ...(groupIds ?? [])]?.filter(Boolean),
          },
        },
        {
          vendorProfileType: ProfileType.ALL_DRIVER_GROUP,
        },
      ],
    };
  }

  if (vendorType === VendorTypes.CARRIER) {
    criteria = {
      ...criteria,
      vendorProfileType: {
        $in: [vendorType, ProfileType.CARRIER_GROUP],
      },
      vendorId: {
        $in: [...(vendorList ?? []), ...(groupIds ?? [])]?.filter(Boolean),
      },
    };
  }

  return criteria;
};

const generateRouteCombinations = (order: any, groupInformation: any) => {
  const combinations = [];
  const customerId = order.customerId?._id ?? order.customerId;

  // Basic combinations
  combinations.push(`${order.type}-${customerId}`);
  if (order.city && order.state) {
    combinations.push(`${order.type}-${order.city},${order.state}`);
  }
  if (order.zip_code) {
    combinations.push(`${order.type}-${order.zip_code}`);
  }

  // Add group combinations if they exist
  const profileGroups = groupInformation?.profile?.[customerId] || [];
  const zipGroups = groupInformation?.zipCode?.[customerId] || [];

  profileGroups.forEach((groupId: any) => {
    combinations.push(`${order.type}-${groupId}`);
  });

  zipGroups.forEach((groupId: any) => {
    combinations.push(`${order.type}-${groupId}`);
  });

  return combinations;
};

const generateLocationCombinations = (order: any, groupInformation: any) => {
  const combinations = [];
  const customerId = order.customerId?._id ?? order.customerId;

  // Basic combinations
  combinations.push(customerId);
  if (order.city && order.state) {
    combinations.push(`${order.city},${order.state}`);
  }
  if (order.zip_code) {
    combinations.push(order.zip_code);
  }

  // Add group combinations if they exist
  const profileGroups = groupInformation?.profile?.[customerId] || [];
  const zipGroups = groupInformation?.zipCode?.[customerId] || [];

  combinations.push(...profileGroups);
  combinations.push(...zipGroups);

  return combinations;
};

export const getRuleBasedCharges = async (routing?: any[], additionalInfo?: any): Promise<any[]> => {
  try {
    if (!routing?.length) return [];

    // Get vendor groups
    const groupIds: string[] = [];
    additionalInfo?.vendorList?.forEach((singleVendor: string) => {
      const groupForVendor = additionalInfo?.groupInformation?.vendor?.[singleVendor];
      groupIds.push(...(groupForVendor ?? []));
    });

    // Build base query
    const payloadForQueryMaker = {
      owner: additionalInfo?.owner,
      groupIds,
      vendorList: additionalInfo?.vendorList,
      vendorType: additionalInfo?.vendorType,
    };
    const validityCheckQuery = queryForVendorValidityCheck(payloadForQueryMaker);

    // Generate route combinations for each order
    const routeCombinations = routing.flatMap(order =>
      generateRouteCombinations(order, additionalInfo?.groupInformation)
    );

    const finalQuery = {
      ...validityCheckQuery,
      moveType: { $ne: "BY_LEG" },
      multiQueryIndex: { $in: routeCombinations }
    };

    return await ChargeTemplateModel.find(finalQuery).lean();
  } catch (error) {
    console.error('Error in getRuleBasedCharges:', error);
    return [];
  }
};

export const getRuleBasedChargesForLocation = async (routing?: any[], additionalInfo?: any): Promise<any[]> => {
  try {
    if (!routing?.length) return [];

    // Get vendor groups
    const groupIds: string[] = [];
    additionalInfo?.vendorList?.forEach((singleVendor: string) => {
      const groupForVendor = additionalInfo?.groupInformation?.vendor?.[singleVendor];
      groupIds.push(...(groupForVendor ?? []));
    });

    // Build base query
    const payloadForQueryMaker = {
      owner: additionalInfo?.owner,
      groupIds,
      vendorList: additionalInfo?.vendorList,
      vendorType: additionalInfo?.vendorType,
    };
    const validityCheckQuery = queryForVendorValidityCheck(payloadForQueryMaker);

    // Generate location combinations for each order
    const locationCombinations = routing.flatMap(order =>
      generateLocationCombinations(order, additionalInfo?.groupInformation)
    );

    const finalQuery = {
      ...validityCheckQuery,
      moveType: { $ne: "BY_LEG" },
      multiQueryIndex: { $in: locationCombinations }
    };

    return await ChargeTemplateModel.find(finalQuery).lean();
  } catch (error) {
    console.error('Error in getRuleBasedChargesForLocation:', error);
    return [];
  }
};

// Keep the existing queryForVendorValidityCheck and getVendorsFromRouting functions
export const getVendorsFromRouting = (loadRoutingData: any, vendorType: string): string[] => {
  let vendorProperty: string;
  switch (vendorType) {
    case VendorTypes.DRIVER:
      vendorProperty = "driver";
      break;
    case VendorTypes.CARRIER:
      vendorProperty = "drayosCarrier";
      break;
    // Add more cases if needed
    default:
      // Handle the default case if necessary
      break;
  }

  return Array.from(
    new Set(
      loadRoutingData?.map((item: any) => item?.[vendorProperty]?._id ?? item?.[vendorProperty])?.filter(Boolean),
    ),
  );
};
