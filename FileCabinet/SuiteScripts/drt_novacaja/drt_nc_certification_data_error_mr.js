/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define([
        'N/search',
        'N/record',
        './drt_cn_lib'
    ],
    function (
        search,
        record,
        drt_cn_lib
    ) {

        function getInputData() {
            try {
                var respuesta = '';
                var arrayColumns = [
                    'custrecord_psg_ei_audit_entity', //:"7895"
                    'custrecord_psg_ei_audit_transaction', //:"56869"
                    'custrecord_psg_ei_audit_details'
                ];
                var arrayFilters = [
                    ['isinactive', search.Operator.IS, 'F'],
                    'and',
                    ['custrecord_psg_ei_audit_event', search.Operator.IS, 21],
                    'and',
                    ['custrecord_psg_ei_audit_event', search.Operator.NONEOF, '@NONE@'],
                    'and',
                    ['custrecord_psg_ei_audit_transaction', search.Operator.NONEOF, '@NONE@']

                ];
                respuesta = search.create({
                    type: 'customrecord_psg_ei_audit_trail',
                    columns: arrayColumns,
                    filters: arrayFilters
                });
            } catch (error) {
                log.error({
                    title: 'error getInputData',
                    details: JSON.stringify(error)
                });
            } finally {
                return respuesta;
            }

        }

        function map(context) {
            try {
                var objvalue = JSON.parse(context.value)

                context.write({
                    key: objvalue.id,
                    value: objvalue
                });
            } catch (error) {
                log.error({
                    title: 'error map',
                    details: JSON.stringify(error)
                });
            }
        }

        function reduce(context) {
            try {
                var recordData = context.values;
                for (var ids in recordData) {
                    try {
                        var data = JSON.parse(recordData[ids]);
                        log.audit({
                            title: 'data',
                            details: JSON.stringify(data)
                        });
                        // data.values.custrecord_psg_ei_audit_entity.value
                        // data.values.custrecord_psg_ei_audit_transaction.value
                        // data.values.custrecord_psg_ei_audit_details

                        // custbody_mx_customer_rfc
                        // custentity_mx_rfc

                        var updateCustomer = drt_cn_lib.submitRecord(record.Type.CUSTOMER, data.values.custrecord_psg_ei_audit_entity.value, {
                            custentity_mx_rfc: 'XAXX010101000'
                        });
                        var updateTransaction = drt_cn_lib.submitRecord(record.Type.INVOICE, data.values.custrecord_psg_ei_audit_transaction.value, {
                            custbody_mx_customer_rfc: 'XAXX010101000',
                            custbody_psg_ei_status: 1
                        });
                        var updateRecord=drt_cn_lib.submitRecord('customrecord_psg_ei_audit_trail', data.id, {
                           isinactive: true
                       });
                        if (
                            updateCustomer.success &&
                            updateRecord.success &&
                            updateTransaction.success
                            ) {

                            var webhookConsultado = 'error';
                            var response = {
                                data: {
                                    code: '',
                                    body: '',
                                }
                            };
                            var dataWebhook = drt_cn_lib.bookWebhook(webhookConsultado);
                            if (dataWebhook.success) {
                                data.webhook = dataWebhook.data.url;
                                response = drt_cn_lib.postWebhook(dataWebhook.data.header, dataWebhook.data.url, data);
                            }
                            log.audit({title:'response '+data.id,details:JSON.stringify(response)});
                        }
                    } catch (error) {
                        log.error({
                            title: 'error reduce',
                            details: JSON.stringify(error)
                        });
                    }
                }
            } catch (error) {
                log.error({
                    title: 'error reduce',
                    details: JSON.stringify(error)
                });
            }
        }

        function summarize(context) {
            try {
                log.audit({
                    title: ' context summary ',
                    details: JSON.stringify(context)
                });
                log.audit({
                    title: 'Usage units consumed',
                    details: context.usage
                });
                log.audit({
                    title: 'Concurrency',
                    details: context.concurrency
                });
                log.audit({
                    title: 'Number of yields',
                    details: context.yields
                });
                var text = '';
                var totalKeysSaved = 0;
                context.output.iterator().each(function (key, value) {
                    text += (key + ' ' + value + '\n');
                    totalKeysSaved++;
                    return true;
                });
                log.audit({
                    title: 'Unique number of letters used in string',
                    details: totalKeysSaved
                });
            } catch (error) {
                log.error({
                    title: 'error summarize',
                    details: JSON.stringify(error)
                });
            }

        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });