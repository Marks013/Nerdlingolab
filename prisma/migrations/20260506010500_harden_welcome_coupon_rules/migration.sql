UPDATE "Coupon"
SET
  "perCustomerLimit" = 1,
  "isPublic" = true,
  "showOnOffers" = false
WHERE UPPER("code") = 'BEMVINDO10';
