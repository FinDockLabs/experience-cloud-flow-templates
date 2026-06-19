public without sharing class CurrencyService {

    public class CurrencyContext {
        @AuraEnabled public List<String> orgCurrencies;
        @AuraEnabled public String       orgDefault;
        @AuraEnabled public String       userCurrency;
    }

    /**
     * Returns the active org currencies, the org corporate default, and the running
     * user's preferred currency.
     *
     * Safe for Experience Cloud guest users: no User-object SOQL is performed.
     * UserInfo.getDefaultCurrency() already resolves to the context user's preferred
     * currency in multi-currency orgs (and to the org default for guest/single-currency).
     *
     * NOTE: the CurrencyService Apex class must be added to the Guest User Profile's
     * "Enabled Apex Class Access" in Setup → Sites → [Site] → Public Access Settings.
     */
    @AuraEnabled(Cacheable=true)
    public static CurrencyContext getCurrencyContext() {
        CurrencyContext ctx = new CurrencyContext();
        ctx.orgCurrencies   = getOrgCurrencies();
        ctx.orgDefault      = UserInfo.getDefaultCurrency();
        ctx.userCurrency    = ctx.orgDefault;
        return ctx;
    }

    @AuraEnabled(Cacheable=true)
    public static List<String> getOrgCurrencies() {
        String           orgDefault = UserInfo.getDefaultCurrency();
        List<String>     result     = new List<String>();

        if (!UserInfo.isMultiCurrencyOrganization()) {
            result.add(orgDefault);
            return result;
        }

        // Dynamic SOQL so this compiles in single-currency orgs too.
        // Wrapped in try/catch: CurrencyType read permission may not be granted
        // to guest user profiles in some org configurations.
        try {
            for (SObject ct : Database.query(
                    'SELECT IsoCode FROM CurrencyType WHERE IsActive = TRUE ORDER BY IsoCode')) {
                result.add((String) ct.get('IsoCode'));
            }
        } catch (Exception e) {
            result.add(orgDefault);
        }

        return result;
    }
}
