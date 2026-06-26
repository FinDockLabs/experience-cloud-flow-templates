/**
 * Payment method configuration for the customPayment component.
 *
 * Run the following script in Developer Console → Execute Anonymous to discover
 * what payment methods, processors, targets and parameters are available in your org:
 *
 *   RestRequest req = new RestRequest();
 *   RestResponse res = new RestResponse();
 *   RestContext.request = req;
 *   RestContext.response = res;
 *   req.requestURI = '/services/apexrest/cpm/v2/PaymentMethods';
 *   req.httpMethod = 'GET';
 *   req.headers.put('verbose', 'true');
 *   cpm.API_PaymentMethod_V2.getPaymentMethods();
 *   System.debug(JSON.serializePretty(JSON.deserializeUntyped(res.responseBody.toString())));
 *
 * Fields:
 *   name            — PaymentMethods[].Name from the API response
 *   processor       — Processors[].Name from the API response
 *   merchantAccount — Processors[].Targets[].Name from the API response
 *                     (for 3rd-party PSPs where Targets is empty, check FinDock Setup UI)
 *   enabledOneTime  — whether to offer one-time payments with this method
 *   enabledRecurring — whether to offer recurring payments (must be false if SupportsRecurring is false in the API)
 *   isDefaultOneTime / isDefaultRecurring — which method is pre-selected (one true per config)
 *   displayLabel    — optional label override shown in the UI (defaults to name)
 *   redirectInstruction — optional message shown before the payer is redirected
 *   parameters      — optional array of parameter overrides (see below)
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
        name: 'CreditCard',
        processor: 'PaymentHub-Stripe',
        merchantAccount: 'My Stripe Test Account',
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
                displayLabel: 'Description of the payment for the payer’s bank',
                required: false
            }
        ]
    },
    {
        name: 'Ideal',
        processor: 'PaymentHub-Stripe',
        merchantAccount: 'My Stripe Test Account',
        enabledOneTime: true,
        enabledRecurring: false,
        isDefaultOneTime: false,
        displayLabel: 'iDEAL',
        redirectInstruction: 'You will be redirected to your bank to complete the payment.'
    }
];


/** //version 1 with params
class ParameterEntry {
    String name; String value; Boolean visibleToCustomer;
    String displayLabel; Boolean required; String dataType; String description;
}
class MethodEntry {
    String name; String processor; String merchantAccount;
    Boolean enabledOneTime; Boolean enabledRecurring;
    Boolean isDefaultOneTime; Boolean isDefaultRecurring;
    String displayLabel; List<ParameterEntry> parameters;
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

List<MethodEntry> config = new List<MethodEntry>();
Boolean isFirst = true;

for (Object m : paymentMethods) {
    Map<String, Object> method = (Map<String, Object>) m;
    for (Object p : (List<Object>) method.get('Processors')) {
        Map<String, Object> proc = (Map<String, Object>) p;
        Boolean supportsRecurring = (Boolean) proc.get('SupportsRecurring');

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

        MethodEntry entry = new MethodEntry();
        entry.name = (String) method.get('Name');
        entry.processor = (String) proc.get('Name');
        entry.merchantAccount = 'TODO — check Flow CPE UI';
        entry.enabledOneTime = true;
        entry.enabledRecurring = supportsRecurring;
        entry.isDefaultOneTime = isFirst;
        entry.isDefaultRecurring = isFirst && supportsRecurring;
        entry.displayLabel = (String) method.get('Name');
        entry.parameters = parameters.isEmpty() ? null : parameters;
        config.add(entry);
        isFirst = false;
    }
}

// JSONGenerator preserves field write order
JSONGenerator gen = JSON.createGenerator(true);
gen.writeStartArray();
for (MethodEntry e : config) {
    gen.writeStartObject();
    gen.writeStringField('name', e.name);
    gen.writeStringField('processor', e.processor);
    gen.writeStringField('merchantAccount', e.merchantAccount);
    gen.writeBooleanField('enabledOneTime', e.enabledOneTime);
    gen.writeBooleanField('enabledRecurring', e.enabledRecurring);
    gen.writeBooleanField('isDefaultOneTime', e.isDefaultOneTime);
    gen.writeBooleanField('isDefaultRecurring', e.isDefaultRecurring);
    gen.writeStringField('displayLabel', e.displayLabel);
    if (e.parameters != null) {
        gen.writeFieldName('parameters');
        gen.writeStartArray();
        for (ParameterEntry p : e.parameters) {
            gen.writeStartObject();
            gen.writeStringField('name', p.name);
            gen.writeStringField('value', p.value);
            gen.writeBooleanField('visibleToCustomer', p.visibleToCustomer);
            gen.writeStringField('displayLabel', p.displayLabel);
            gen.writeBooleanField('required', p.required);
            gen.writeStringField('dataType', p.dataType);
            gen.writeStringField('description', p.description);
            gen.writeEndObject();
        }
        gen.writeEndArray();
    }
    gen.writeEndObject();
}
gen.writeEndArray();
System.debug(gen.getAsString());
*/