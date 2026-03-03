const { sequelize } = require('../src/config/db');

(async () => {
  const [[row]] = await sequelize.query(
    "select to_regclass('public.merchant_subscriptions') as merchant_subscriptions, to_regclass('public.merchant_subscription_plans') as merchant_subscription_plans"
  );
  console.log(row);
  await sequelize.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
