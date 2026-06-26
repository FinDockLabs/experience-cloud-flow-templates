/**
 * Option 3 — API-inspired nested config format.
 *
 * Structure mirrors the API response from:
 *   GET /services/apexrest/cpm/v2/PaymentMethods (with verbose=true header)
 *
 * Workflow:
 *   1. Run the Anonymous Apex discovery script (see customPaymentMethodConfiguration.js)
 *   2. Copy the paymentMethods[] array from the response
 *   3. For each processor entry, remove fields you don't need (image, InitialPaymentOnRecurring, etc.)
 *   4. Add the developer-specific fields below each processor:
 *      - merchantAccount  : from Flow CPE merchant account picker
 *      - enabledOneTime   : which payment modes to offer
 *      - enabledRecurring : must match SupportsRecurring from the API (false if API says false)
 *      - isDefaultOneTime / isDefaultRecurring : one true per config
 *      - displayLabel     : optional UI label override
 *      - redirectInstruction : optional message before PSP redirect
 *      - parameters       : override/add parameters (see Option 1 config for field docs)
 *
 * Key advantage over Option 1:
 *   supportsRecurring is written explicitly from the API response,
 *   so there is no risk of enabling recurring for a method that does not support it.
 *
 * Key advantage over Option 1 for multi-processor setups:
 *   A single payment method (e.g. CreditCard) can be offered through multiple
 *   processors simply by adding entries to the processors[] array.
 */
export const PAYMENT_METHOD_CONFIG_V3 = [
    {
        name: 'CreditCard',                     // API: PaymentMethods[].Name
        processors: [
            {
                name: 'PaymentHub-Stripe',       // API: Processors[].Name
                supportsRecurring: true,          // API: Processors[].SupportsRecurring — copy exactly
                merchantAccount: 'My Stripe Test Account',

                // Developer decisions — not in API response:
                enabledOneTime: true,
                enabledRecurring: true,
                isDefaultOneTime: true,
                isDefaultRecurring: true,
                displayLabel: 'Credit Card',
                parameters: [
                    {
                        name: 'locale',           // API: Parameters[].Name
                        value: 'nl-NL',
                        visibleToCustomer: false
                    },
                    {
                        name: 'description',      // API: Parameters[].Name
                        value: '',
                        visibleToCustomer: true,
                        displayLabel: 'Add a personal message (optional)',
                        required: false
                    }
                ]
            }
        ]
    },
    {
        name: 'Ideal',                           // API: PaymentMethods[].Name
        processors: [
            {
                name: 'PaymentHub-Stripe',        // API: Processors[].Name
                supportsRecurring: false,          // API: Processors[].SupportsRecurring — false, so enabledRecurring must also be false
                merchantAccount: 'My Stripe Test Account',

                enabledOneTime: true,
                enabledRecurring: false,           // must match supportsRecurring above
                isDefaultOneTime: false,
                displayLabel: 'iDEAL',
                redirectInstruction: 'You will be redirected to your bank to complete the payment.'
            }
        ]
    }
];
