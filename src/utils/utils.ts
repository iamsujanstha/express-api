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

export const getRuleBasedCharges = async (routing?: any, additionalInfo?: any): Promise<any[]> => {
  let groupIds: string[] = [];

  additionalInfo?.vendorList?.forEach((singleVendor: string) => {
    const groupForVendor = additionalInfo?.groupInformation?.vendor?.[singleVendor];
    groupIds = [...groupIds, ...(groupForVendor ?? [])];
  });

  const payloadForQueryMaker = {
    owner: additionalInfo?.owner,
    groupIds,
    vendorList: additionalInfo?.vendorList,
    vendorType: additionalInfo?.vendorType,
  };
  const validityCheckQuery = queryForVendorValidityCheck(payloadForQueryMaker);
  let finalQuery = { ...validityCheckQuery };

  const countQuery = { ...finalQuery, "multiQueryIndex.0": { $exists: true } };
  const chargeTemplateCount: any = await ChargeTemplateModel.findOne(countQuery).lean();
  if (!chargeTemplateCount) return [];
  const queryForRouting = findCombination(routing, additionalInfo?.groupInformation);
  const orCriteria = finalQuery?.$or;
  delete finalQuery?.$or;

  finalQuery = {
    ...finalQuery,
    moveType: { $ne: "BY_LEG" },
    $and: [{ $or: queryForRouting?.map((singleRoutingQuery: any) => ({ multiQueryIndex: singleRoutingQuery })) }],
  };

  if (orCriteria) {
    finalQuery.$and.push({ $or: orCriteria });
  }

  return await ChargeTemplateModel.find(finalQuery).lean();
};

const findCombination = (driverOrders = [], groupInformation: any) => {
  const minWindowSize = 2;
  let totalCombinations = [];

  for (let frame = minWindowSize; frame <= driverOrders.length; frame++) {
    let iterations = driverOrders.length - frame + 1;
    for (let i = 0; i < iterations; i++) {
      const slicedOrder = driverOrders.slice(i, i + frame);
      // find the combination of the slicedOrder
      const combination = getCombination(slicedOrder, groupInformation);
      totalCombinations.push(combination);
    }
  }

  const flatTotalCombination = totalCombinations.flat();

  return flatTotalCombination?.map((singleCombination: any) => singleCombination?.filter(Boolean));
};

const getCombination = (slicedOrder: any = [], groupInformation: any) => {
  // Define possible profile attributes for each order
  const combinations: any = [];

  // Helper function to recursively generate combinations
  const generateCombinations = (index: any, currentCombination: any) => {
    const profileGroup = _.uniq(
      groupInformation?.profile?.[slicedOrder?.[index]?.customerId?._id ?? slicedOrder?.[index]?.customerId ?? ""],
    );
    const zipCodeGroup = _.uniq(
      groupInformation?.zipCode?.[slicedOrder?.[index]?.customerId?._id ?? slicedOrder?.[index]?.customerId ?? ""],
    );
    const cityStateGroup = _.uniq(
      groupInformation?.cityState?.[slicedOrder?.[index]?.customerId?._id ?? slicedOrder?.[index]?.customerId ?? ""],
    );

    if (index === slicedOrder?.length) {
      // If we've handled all orders, add the current combination to results
      combinations.push([...currentCombination]);
      return;
    }

    // For each order, create a new combination for each possible profile attribute
    // Use customerId
    if (slicedOrder[index].customerId?._id || slicedOrder[index].customerId) {
      generateCombinations(index + 1, [
        ...currentCombination,
        `${slicedOrder[index].type}-${slicedOrder[index].customerId?._id ?? slicedOrder[index].customerId}`,
      ]);
    }

    // Use cityState
    if (slicedOrder[index].city && slicedOrder[index].state) {
      generateCombinations(index + 1, [
        ...currentCombination,
        `${slicedOrder[index].type}-${slicedOrder[index].city},${slicedOrder[index].state}`,
      ]);
    }

    // Use zip_code
    if (slicedOrder[index].zip_code) {
      generateCombinations(index + 1, [
        ...currentCombination,
        `${slicedOrder[index].type}-${slicedOrder[index].zip_code}`,
      ]);
    }

    // only types
    generateCombinations(index + 1, [...currentCombination, `${slicedOrder[index].type}`]);

    // Profile Group
    if (profileGroup?.length) {
      profileGroup.forEach((singleProfile: any) => {
        generateCombinations(index + 1, [...currentCombination, `${slicedOrder[index].type}-${singleProfile}`]);
      });
    }

    // All Customer
    generateCombinations(index + 1, [...currentCombination, `${slicedOrder[index].type}-${ProfileType.ALL_CUSTOMER}`]);

    // city state group
    if (cityStateGroup?.length) {
      cityStateGroup.forEach((singleProfile: any) => {
        generateCombinations(index + 1, [...currentCombination, `${slicedOrder[index].type}-${singleProfile}`]);
      });
    }

    // zip code group
    if (zipCodeGroup?.length) {
      zipCodeGroup.forEach((singleProfile: any) => {
        generateCombinations(index + 1, [...currentCombination, `${slicedOrder[index].type}-${singleProfile}`]);
      });
    }
  };

  // Start the recursive generation with the first order
  generateCombinations(0, []);

  return combinations;
};

export const getRuleBasedChargesForLocation = async (routing?: any, additionalInfo?: any): Promise<any[]> => {
  let groupIds: string[] = [];

  additionalInfo?.vendorList?.forEach((singleVendor: string) => {
    const groupForVendor = additionalInfo?.groupInformation?.vendor?.[singleVendor];
    groupIds = [...groupIds, ...(groupForVendor ?? [])];
  });

  const payloadForQueryMaker = {
    owner: additionalInfo?.owner,
    groupIds,
    vendorList: additionalInfo?.vendorList,
    vendorType: additionalInfo?.vendorType,
  };
  const validityCheckQuery = queryForVendorValidityCheck(payloadForQueryMaker);
  let finalQuery = { ...validityCheckQuery };

  const countQuery = { ...finalQuery, "multiQueryIndex.0": { $exists: true } };
  const chargeTemplateCount: any = await ChargeTemplateModel.findOne(countQuery).lean();

  if (!chargeTemplateCount) return [];
  const queryForRouting = findLocationCombination(routing, additionalInfo?.groupInformation);
  const orCriteria = finalQuery?.$or;
  delete finalQuery?.$or;

  finalQuery = {
    ...finalQuery,
    moveType: { $ne: "BY_LEG" },
    $and: [{ $or: queryForRouting?.map((singleRoutingQuery: any) => ({ multiQueryIndex: singleRoutingQuery })) }],
  };

  if (orCriteria) {
    finalQuery.$and.push({ $or: orCriteria });
  }

  return await ChargeTemplateModel.find(finalQuery).lean();
};

const findLocationCombination = (driverOrders = [], groupInformation: any) => {
  const minWindowSize = 2;
  let totalCombinations = [];

  for (let frame = minWindowSize; frame <= driverOrders.length; frame++) {
    let iterations = driverOrders.length - frame + 1;
    for (let i = 0; i < iterations; i++) {
      const slicedOrder = driverOrders.slice(i, i + frame);
      // find the combination of the slicedOrder
      const combination = getLocationCombination(slicedOrder, groupInformation);
      totalCombinations.push(combination);
    }
  }

  const flatTotalCombination = totalCombinations.flat();

  return flatTotalCombination?.map((singleCombination: any) => singleCombination?.filter(Boolean));
};

const getLocationCombination = (slicedOrder: any = [], groupInformation: any) => {
  // Define possible profile attributes for each order
  const combinations: any = [];

  // Helper function to recursively generate combinations
  const generateCombinations = (index: any, currentCombination: any) => {
    const profileGroup = _.uniq(
      groupInformation?.profile?.[slicedOrder?.[index]?.customerId?._id ?? slicedOrder?.[index]?.customerId ?? ""],
    );
    const zipCodeGroup = _.uniq(
      groupInformation?.zipCode?.[slicedOrder?.[index]?.customerId?._id ?? slicedOrder?.[index]?.customerId ?? ""],
    );
    const cityStateGroup = _.uniq(
      groupInformation?.cityState?.[slicedOrder?.[index]?.customerId?._id ?? slicedOrder?.[index]?.customerId ?? ""],
    );

    if (index === slicedOrder?.length) {
      // If we've handled all orders, add the current combination to results
      combinations.push([...currentCombination]);
      return;
    }

    // Use customerId for location only
    if (slicedOrder[index].customerId?._id || slicedOrder[index].customerId) {
      generateCombinations(index + 1, [
        ...currentCombination,
        `${slicedOrder[index].customerId?._id ?? slicedOrder[index].customerId}`,
      ]);
    }

    // Use cityState for location only
    if (slicedOrder[index].city && slicedOrder[index].state) {
      generateCombinations(index + 1, [
        ...currentCombination,
        `${slicedOrder[index].city},${slicedOrder[index].state}`,
      ]);
    }

    // Use zip_code for location only
    if (slicedOrder[index].zip_code) {
      generateCombinations(index + 1, [...currentCombination, `${slicedOrder[index].zip_code}`]);
    }

    // All Customer for location only
    generateCombinations(index + 1, [...currentCombination, `${ProfileType.ALL_CUSTOMER}`]);

    // Profile Group for location only
    if (profileGroup?.length) {
      profileGroup.forEach((singleProfile) => {
        generateCombinations(index + 1, [...currentCombination, `${singleProfile}`]);
      });
    }

    // city state group for location only
    if (cityStateGroup?.length) {
      cityStateGroup.forEach((singleProfile) => {
        generateCombinations(index + 1, [...currentCombination, `${singleProfile}`]);
      });
    }

    // zip code group for location only
    if (zipCodeGroup?.length) {
      zipCodeGroup.forEach((singleProfile) => {
        generateCombinations(index + 1, [...currentCombination, `${singleProfile}`]);
      });
    }
  };

  // Start the recursive generation with the first order
  generateCombinations(0, []);

  return combinations;
};

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
