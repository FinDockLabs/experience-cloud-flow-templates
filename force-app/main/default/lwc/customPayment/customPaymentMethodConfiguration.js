/**
 * Payment method configuration for the customPayment component.
 *
 * Run the following script in Developer Console → Execute Anonymous to generate
 * this config from your org's installed payment methods:
 *
 * class ParameterEntry {
 *     String name; String value; Boolean visibleToCustomer;
 *     String displayLabel; Boolean required; String dataType; String description;
 * }
 * class MethodEntry {
 *     String paymentMethod; String paymentProcessor; String target;
 *     Boolean enabledOneTime; Boolean enabledRecurring;
 *     Boolean isDefaultOneTime; Boolean isDefaultRecurring;
 *     String displayLabel; List<ParameterEntry> parameters;
 * }
 * RestRequest req = new RestRequest();
 * RestResponse res = new RestResponse();
 * RestContext.request = req; RestContext.response = res;
 * req.requestURI = '/services/apexrest/cpm/v2/PaymentMethods';
 * req.httpMethod = 'GET';
 * req.headers.put('verbose', 'true');
 * cpm.API_PaymentMethod_V2.getPaymentMethods();
 * Map<String, Object> apiResponse = (Map<String, Object>) JSON.deserializeUntyped(res.responseBody.toString());
 * List<Object> paymentMethods = (List<Object>) apiResponse.get('PaymentMethods');
 * List<MethodEntry> config = new List<MethodEntry>();
 * Boolean isFirst = true;
 * for (Object m : paymentMethods) {
 *     Map<String, Object> method = (Map<String, Object>) m;
 *     for (Object p : (List<Object>) method.get('Processors')) {
 *         Map<String, Object> proc = (Map<String, Object>) p;
 *         Boolean supportsRecurring = (Boolean) proc.get('SupportsRecurring');
 *         List<ParameterEntry> parameters = new List<ParameterEntry>();
 *         List<Object> rawParams = (List<Object>) proc.get('Parameters');
 *         if (rawParams != null) {
 *             for (Object raw : rawParams) {
 *                 Map<String, Object> rp = (Map<String, Object>) raw;
 *                 ParameterEntry pe = new ParameterEntry();
 *                 pe.name = (String) rp.get('Name'); pe.value = '';
 *                 pe.visibleToCustomer = false; pe.displayLabel = (String) rp.get('Name');
 *                 pe.required = (Boolean) rp.get('Required'); pe.dataType = (String) rp.get('DataType');
 *                 pe.description = (String) rp.get('Description');
 *                 parameters.add(pe);
 *             }
 *         }
 *         MethodEntry entry = new MethodEntry();
 *         entry.paymentMethod = (String) method.get('Name');
 *         entry.paymentProcessor = (String) proc.get('Name');
 *         entry.target = 'TODO — check Flow CPE UI';
 *         entry.enabledOneTime = true; entry.enabledRecurring = supportsRecurring;
 *         entry.isDefaultOneTime = isFirst; entry.isDefaultRecurring = isFirst && supportsRecurring;
 *         entry.displayLabel = (String) method.get('Name');
 *         entry.parameters = parameters.isEmpty() ? null : parameters;
 *         config.add(entry); isFirst = false;
 *     }
 * }
 * List<String> out = new List<String>();
 * out.add('[');
 * for (Integer mi = 0; mi < config.size(); mi++) {
 *     MethodEntry e = config[mi];
 *     out.add('    {');
 *     out.add('        paymentMethod: \'' + e.paymentMethod + '\',');
 *     out.add('        paymentProcessor: \'' + e.paymentProcessor + '\',');
 *     out.add('        target: \'' + e.target + '\',');
 *     out.add('        enabledOneTime: ' + e.enabledOneTime + ',');
 *     out.add('        enabledRecurring: ' + e.enabledRecurring + ',');
 *     out.add('        isDefaultOneTime: ' + e.isDefaultOneTime + ',');
 *     out.add('        isDefaultRecurring: ' + e.isDefaultRecurring + ',');
 *     if (e.parameters != null) {
 *         out.add('        displayLabel: \'' + e.displayLabel + '\',');
 *         out.add('        parameters: [');
 *         for (Integer pi = 0; pi < e.parameters.size(); pi++) {
 *             ParameterEntry p = e.parameters[pi];
 *             out.add('            {');
 *             out.add('                name: \'' + p.name + '\',');
 *             out.add('                value: \'\',');
 *             out.add('                visibleToCustomer: ' + p.visibleToCustomer + ',');
 *             out.add('                displayLabel: \'' + p.displayLabel + '\',');
 *             out.add('                required: ' + p.required + ',');
 *             out.add('                dataType: \'' + p.dataType + '\',');
 *             out.add('                description: \'' + p.description.replace('\'', '\\\'') + '\'');
 *             out.add(pi < e.parameters.size() - 1 ? '            },' : '            }');
 *         }
 *         out.add('        ]');
 *     } else {
 *         out.add('        displayLabel: \'' + e.displayLabel + '\'');
 *     }
 *     out.add(mi < config.size() - 1 ? '    },' : '    }');
 * }
 * out.add(']');
 * System.debug(String.join(out, '\n'));
 *
 * Fields:
 *   paymentMethod       — PaymentMethods[].Name from the API response
 *   paymentProcessor    — Processors[].Name from the API response
 *   target              — merchant account name; check Flow CPE UI (Targets not in API response)
 *   enabledOneTime      — whether to offer one-time payments with this method
 *   enabledRecurring    — must be false if SupportsRecurring is false in the API response
 *   isDefaultOneTime / isDefaultRecurring — which method is pre-selected (one true per config)
 *   displayLabel        — optional label shown in the UI (defaults to paymentMethod)
 *   redirectInstruction — optional message shown before the payer is redirected
 *   parameters          — optional array of parameter overrides (see below)
 *
 * Parameter fields:
 *   name              — Parameters[].Name from the API response
 *   value             — pre-filled value sent to the processor (use for hidden parameters)
 *   visibleToCustomer — true: render as input field | false: send value silently
 *   displayLabel      — label shown in the UI when visibleToCustomer is true (defaults to name)
 *   required          — whether the payer must fill in the field
 */
export const PAYMENT_METHOD_CONFIG = [
    {
        paymentMethod: 'CreditCard',
        paymentProcessor: 'PaymentHub-Stripe',
        target: 'My Stripe Test Account',
        enabledOneTime: true,
        enabledRecurring: true,
        isDefaultOneTime: true,
        isDefaultRecurring: true,
        displayLabel: 'Credit Card',
        parameters: [
            {
                name: 'locale',
                value: 'nl-NL',
                visibleToCustomer: false
            },
            {
                name: 'description',
                value: '',
                visibleToCustomer: true,
                displayLabel: 'Description of the payment for the payer\'s bank',
                required: false
            }
        ]
    },
    {
        paymentMethod: 'Ideal',
        paymentProcessor: 'PaymentHub-Stripe',
        target: 'My Stripe Test Account',
        enabledOneTime: true,
        enabledRecurring: false,
        isDefaultOneTime: false,
        isDefaultRecurring: false,
        displayLabel: 'iDEAL',
        redirectInstruction: 'You will be redirected to your bank to complete the payment.'
    }
];
