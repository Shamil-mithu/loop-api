const getStoreRatesAndAppCashback = (actions_detail, store_currency) => {
  try {
    let store_cashback = "";
    var min_store_cashback = 0;
    var max_store_cashback = 0;
    var store_cashback_type = store_currency;
    var store_rates = [];

    actions_detail.forEach((action_detail) => {
      const action_name = action_detail.name;
      var min_cashback = 0;
      var max_cashback = 0;
      var cashback_type = store_currency;

      action_detail.tariffs.forEach((tariff) => {
        tariff.rates.forEach(({ is_percentage, app_cashback }) => {
          if (is_percentage && is_percentage !== "false") {
            cashback_type = "%";
            store_cashback_type = "%";
          }

          if (app_cashback < min_cashback || min_cashback === 0) {
            min_cashback = parseFloat(app_cashback);
            if (min_cashback < min_store_cashback || min_store_cashback === 0) {
              min_store_cashback = min_cashback;
            }
          }

          if (app_cashback > max_cashback || max_cashback === 0) {
            max_cashback = parseFloat(app_cashback);
            if (max_cashback > max_store_cashback || max_store_cashback === 0) {
              max_store_cashback = max_cashback;
            }
          }
        });
      });

      // rate data
      store_rates.push({
        name: action_name,
        cashback:
          min_cashback === max_cashback
            ? `${min_cashback}${cashback_type}`
            : `${min_cashback}-${max_cashback}${cashback_type}`,
      });
    });

    // return data
    if (min_store_cashback === max_store_cashback) {
      store_cashback = `${min_store_cashback}${store_cashback_type}`;
    } else {
      store_cashback = `${min_store_cashback}-${max_store_cashback}${store_cashback_type}`;
    }
    return {
      rates: store_rates,
      app_cashback: store_cashback,
    };
  } catch (error) {
    console.log(
      `ERROR retrieving rates and app cashback from a store:` + error.message ??
        error
    );
  }
};

module.exports = getStoreRatesAndAppCashback;
