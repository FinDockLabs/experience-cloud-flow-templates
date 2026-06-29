/**
 Structure mirrors the API response from:
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

/**
//Option 3
class ParameterEntry {
    String name; String value; Boolean visibleToCustomer;
    String displayLabel; Boolean required; String dataType; String description;
}
RestRequest req = new RestRequest();
RestResponse res = new RestResponse();
RestContext.request = req;
RestContext.response = res;
req.requestURI = '/services/apexrest/cpm/v2/PaymentMethods';
req.httpMethod = 'GET';
req.headers.put('verbose', 'true');
cpm.API_PaymentMethod_V2.getPaymentMethods();
Map<String, Object> apiResponse = (Map<String, Object>) JSON.deserializeUntyped(res.responseBody.toString());
List<Object> paymentMethods = (List<Object>) apiResponse.get('PaymentMethods');
Boolean isFirstProcessor = true;
JSONGenerator gen = JSON.createGenerator(true);
gen.writeStartArray();
for (Object m : paymentMethods) {
    Map<String, Object> method = (Map<String, Object>) m;
    List<Object> processors = (List<Object>) method.get('Processors');
    gen.writeStartObject();
    gen.writeStringField('name', (String) method.get('Name'));
    gen.writeFieldName('processors');
    gen.writeStartArray();
    for (Object p : processors) {
        Map<String, Object> proc = (Map<String, Object>) p;
        Boolean supportsRecurring = (Boolean) proc.get('SupportsRecurring');
        // Build parameters
        List<ParameterEntry> parameters = new List<ParameterEntry>();
        List<Object> rawParams = (List<Object>) proc.get('Parameters');
        if (rawParams != null) {
            for (Object raw : rawParams) {
                Map<String, Object> rp = (Map<String, Object>) raw;
                ParameterEntry pe = new ParameterEntry();
                pe.name = (String) rp.get('Name');
                pe.value = '';
                pe.visibleToCustomer = false;
                pe.displayLabel = (String) rp.get('Name');
                pe.required = (Boolean) rp.get('Required');
                pe.dataType = (String) rp.get('DataType');
                pe.description = (String) rp.get('Description');
                parameters.add(pe);
            }
        }
        gen.writeStartObject();
        gen.writeStringField('name', (String) proc.get('Name'));
        gen.writeBooleanField('supportsRecurring', supportsRecurring);
        gen.writeStringField('merchantAccount', 'TODO — check Flow CPE UI');
        gen.writeBooleanField('enabledOneTime', true);
        gen.writeBooleanField('enabledRecurring', supportsRecurring);
        gen.writeBooleanField('isDefaultOneTime', isFirstProcessor);
        gen.writeBooleanField('isDefaultRecurring', isFirstProcessor && supportsRecurring);
        gen.writeStringField('displayLabel', (String) method.get('Name'));
        if (!parameters.isEmpty()) {
            gen.writeFieldName('parameters');
            gen.writeStartArray();
            for (ParameterEntry pe : parameters) {
                gen.writeStartObject();
                gen.writeStringField('name', pe.name);
                gen.writeStringField('value', pe.value);
                gen.writeBooleanField('visibleToCustomer', pe.visibleToCustomer);
                gen.writeStringField('displayLabel', pe.displayLabel);
                gen.writeBooleanField('required', pe.required);
                gen.writeStringField('dataType', pe.dataType);
                gen.writeStringField('description', pe.description);
                gen.writeEndObject();
            }
            gen.writeEndArray();
        }
        gen.writeEndObject();
        isFirstProcessor = false;
    }
    gen.writeEndArray();
    gen.writeEndObject();
}
gen.writeEndArray();
System.debug(gen.getAsString());
*/