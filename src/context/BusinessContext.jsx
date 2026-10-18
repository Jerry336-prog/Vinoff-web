import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { unwrapApiRecord } from "../utils/apiResponse";

export const DEFAULT_BUSINESS_INFO = {
  businessName: "Vinoff Wholesales Ltd",
  brandTitle: "VINOFF WHOLESALES",
  tagline: "Commercial Toiletries, Sanitizers & Industrial Detergents",
  headerSubtitle: "Toiletries & Household",
  watermarkText: "VINOFF & CO.NIG.LTD",
  emailContact: "sales@vinoff.com",
  supportEmail: "support@vinoff.com",
  phoneContact: "+234 80 1234 5678",
  secondaryPhone: "+234 803 000 0000",
  shopAddress: "KADUNA PLAZA 1, BLOCK A, SHOP 22",
  complexArea: "INT’L CENTRE FOR COMMERCE, TRADE-FAIR COMPLEX",
  cityState: "BADAGRY EXPRESS WAY, LAGOS, NIGERIA",
  operatingHours: "Monday – Saturday: 8:00 AM – 6:00 PM",
  googleMapsUrl: "https://maps.google.com/?q=Trade+Fair+Complex+Badagry+Expressway+Lagos",
  walkthroughVideoUrl: "/store/VINOFF_CO_walkthrough.MP4",
  footerNote:
    "Wire payments transfer slips proof must be submitted in support chats to begin packing and logistics.",
};

export const DEFAULT_BANK_DETAILS = {
  bankName: "Guaranty Trust Bank (GTB)",
  accountName: "Vinoff Wholesales Ltd",
  accountNumber: "0123456789",
  instructions: "Please use your Order # or Invoice # as the transfer payment narration.",
};

const BUSINESS_CACHE_KEY = "vinoff_business_info_v1";
const BANK_CACHE_KEY = "vinoff_bank_details_v1";

const normalizeBusinessInfo = (raw = {}) => {
  const merged = { ...DEFAULT_BUSINESS_INFO, ...(raw || {}) };
  if (
    merged.walkthroughVideoUrl === "/VINOFF_C0_walkthrough.MP4" ||
    merged.walkthroughVideoUrl === "/VINOFF_CO_walkthrough.MP4"
  ) {
    merged.walkthroughVideoUrl = "/store/VINOFF_CO_walkthrough.MP4";
  }
  return merged;
};

export const getCachedBusinessInfo = () => {
  try {
    const raw = localStorage.getItem(BUSINESS_CACHE_KEY);
    if (raw) {
      return normalizeBusinessInfo(JSON.parse(raw));
    }
  } catch (_) {}
  return { ...DEFAULT_BUSINESS_INFO };
};

export const setCachedBusinessInfo = (data) => {
  const normalized = normalizeBusinessInfo(data);
  try {
    localStorage.setItem(BUSINESS_CACHE_KEY, JSON.stringify(normalized));
  } catch (_) {}
  return normalized;
};

export const getCachedBankDetails = () => {
  try {
    const raw = localStorage.getItem(BANK_CACHE_KEY);
    if (raw) {
      return { ...DEFAULT_BANK_DETAILS, ...JSON.parse(raw) };
    }
  } catch (_) {}
  return { ...DEFAULT_BANK_DETAILS };
};

export const setCachedBankDetails = (data) => {
  const normalized = { ...DEFAULT_BANK_DETAILS, ...(data || {}) };
  try {
    localStorage.setItem(BANK_CACHE_KEY, JSON.stringify(normalized));
  } catch (_) {}
  return normalized;
};

export const fetchLiveBusinessInfo = async () => {
  try {
    const res = await api.get("/api/settings/store-location");
    const record = unwrapApiRecord(res) || res.data?.data || res.data || res;
    if (record && typeof record === "object") {
      return setCachedBusinessInfo(record);
    }
  } catch (_) {}
  return getCachedBusinessInfo();
};

export const fetchLiveBankDetails = async () => {
  try {
    const res = await api.get("/api/settings/bank-details");
    const record = unwrapApiRecord(res) || res.data?.data || res.data || res;
    if (record && record.bankName) {
      return setCachedBankDetails(record);
    }
  } catch (_) {}
  return getCachedBankDetails();
};

export const BusinessContext = createContext({
  businessInfo: DEFAULT_BUSINESS_INFO,
  bankDetails: DEFAULT_BANK_DETAILS,
  updateBusinessInfoState: () => {},
  updateBankDetailsState: () => {},
  refreshBusinessData: async () => {},
});

export const BusinessProvider = ({ children }) => {
  const [businessInfo, setBusinessInfo] = useState(() => getCachedBusinessInfo());
  const [bankDetails, setBankDetails] = useState(() => getCachedBankDetails());

  const updateBusinessInfoState = useCallback((nextData) => {
    setBusinessInfo((prev) => {
      const merged = setCachedBusinessInfo({ ...prev, ...(nextData || {}) });
      return merged;
    });
  }, []);

  const updateBankDetailsState = useCallback((nextBank) => {
    setBankDetails((prev) => {
      const merged = setCachedBankDetails({ ...prev, ...(nextBank || {}) });
      return merged;
    });
  }, []);

  const refreshBusinessData = useCallback(async () => {
    const [liveBiz, liveBank] = await Promise.all([
      fetchLiveBusinessInfo(),
      fetchLiveBankDetails(),
    ]);
    if (liveBiz) setBusinessInfo(liveBiz);
    if (liveBank) setBankDetails(liveBank);
  }, []);

  useEffect(() => {
    refreshBusinessData();
  }, [refreshBusinessData]);

  return (
    <BusinessContext.Provider
      value={{
        businessInfo,
        bankDetails,
        updateBusinessInfoState,
        updateBankDetailsState,
        refreshBusinessData,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => useContext(BusinessContext);

export default BusinessContext;
