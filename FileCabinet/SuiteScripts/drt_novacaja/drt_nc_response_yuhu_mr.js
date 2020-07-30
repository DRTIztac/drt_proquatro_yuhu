/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './drt_cn_lib', 'N/runtime', 'N/format'],
    function (search, record, drt_cn_lib, runtime, format) {

        function getInputData() {
            try {


                var arrayFilter = [
                    [
                        ['type', search.Operator.ANYOF, 'CustInvc'],
                        'and',
                        ['custbody_drt_nc_con_in', search.Operator.NONEOF, '@NONE@'],
                        'and',
                        ['custbody_drt_nc_pendiente_enviar', search.Operator.IS, "T"],
                        'and',
                        ['mainline', search.Operator.IS, 'T'],
                        'and',
                        ['custbody_drt_nc_notificacion_registro', search.Operator.ISEMPTY, ""]
                    ],
                    'or',
                    [
                        ['type', search.Operator.IS, 'SalesOrd'],
                        'and',
                        ['custbody_drt_nc_con_so', search.Operator.NONEOF, '@NONE@'],
                        'and',
                        ['custbody_drt_nc_pendiente_enviar', search.Operator.IS, "T"],
                        'and',
                        ['mainline', search.Operator.IS, 'T'],
                        'and',
                        ['custbody_drt_nc_notificacion_registro', search.Operator.ISEMPTY, ""]
                    ],
                    'or',
                    [
                        ['type', search.Operator.ANYOF, 'CustPymt'],
                        'and',
                        ['custbody_drt_nc_con_cp', search.Operator.NONEOF, '@NONE@'],
                        'and',
                        ['custbody_drt_nc_pendiente_enviar', search.Operator.IS, "T"],
                        'and',
                        ['mainline', search.Operator.IS, 'T'],
                        'and',
                        ['custbody_drt_nc_notificacion_registro', search.Operator.ISEMPTY, ""]
                    ],
                    'or',
                    [
                        ['type', search.Operator.ANYOF, 'CashSale'],
                        'and',
                        ['custbody_drt_nc_con_cs', search.Operator.NONEOF, '@NONE@'],
                        'and',
                        ['custbody_drt_nc_pendiente_enviar', search.Operator.IS, "T"],
                        'and',
                        ['mainline', search.Operator.IS, 'T'],
                        'and',
                        ['custbody_drt_nc_notificacion_registro', search.Operator.ISEMPTY, ""]
                    ],
                    'or',
                    [
                        ['type', search.Operator.ANYOF, 'Journal'],
                        'and',
                        ['custbody_drt_nc_con_je', search.Operator.NONEOF, '@NONE@'],
                        'and',
                        ['custbody_drt_nc_pendiente_enviar', search.Operator.IS, "T"],
                        'and',
                        ['mainline', search.Operator.IS, 'T'],
                        'and',
                        ['custbody_drt_nc_notificacion_registro', search.Operator.ISEMPTY, ""]
                    ]
                ];

                log.audit({
                    title: 'arrayFilter',
                    details: JSON.stringify(arrayFilter)
                });
                var respuesta = search.create({
                    type: search.Type.TRANSACTION,
                    columns: [{
                            name: 'trandate'
                        },
                        {
                            name: 'tranid'
                        },
                        {
                            name: 'amount'
                        },
                        {
                            name: 'entity'
                        },
                        {
                            name: 'total'
                        },
                        {
                            name: 'taxtotal'
                        },
                        {
                            name: 'custbody_drt_nc_pendiente_enviar'
                        },
                        {
                            name: 'custbody_drt_nc_con_cp'
                        },
                        {
                            name: 'custbody_drt_nc_con_cs'
                        },
                        {
                            name: 'custbody_drt_nc_con_in'
                        },
                        {
                            name: 'custbody_drt_nc_con_je'
                        },
                        {
                            name: 'custbody_drt_nc_con_so'
                        },
                        {
                            name: 'custbody_drt_nc_notificacion_registro'
                        },
                        {
                            name: 'custbody_drt_nc_identificador_folio'
                        },
                        {
                            name: 'custbody_drt_nc_identificador_uuid'
                        },
                        {
                            name: 'custbody_drt_nc_folio_sustitucion'
                        },
                        {
                            name: 'custbody_drt_nc_num_amortizacion'
                        },
                        {
                            name: 'custbody_drt_nc_tipo_descuento'
                        },
                        {
                            name: 'custbody_drt_nc_total_transaccion'
                        },
                        {
                            name: 'custbody_drt_nc_total_iva'
                        },
                        {
                            name: 'custbody_drt_nc_total_interes'
                        },
                        {
                            name: 'custbody_drt_nc_total_capital'
                        },
                        {
                            name: 'custbody_drt_nc_createdfrom'
                        },
                        {
                            name: 'custbody_drt_nc_tipo_pago'
                        }, {
                            name: "custentity_drt_nc_curp",
                            join: "customer"
                        }, {
                            name: "custentity_drt_nc_uuid_yuhu",
                            join: "customer"
                        }, {
                            name: "custentity_mx_rfc",
                            join: "customer"
                        }, {
                            name: "isperson",
                            join: "customer"
                        }, {
                            name: "companyname",
                            join: "customer"
                        }, {
                            name: "firstname",
                            join: "customer"
                        }, {
                            name: "lastname",
                            join: "customer"
                        }, {
                            name: "email",
                            join: "customer"
                        }
                    ],
                    filters: arrayFilter
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
                log.audit({
                    title: ' context map ',
                    details: JSON.stringify(context)
                });
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
                        var objupdate = {};
                        var data = JSON.parse(recordData[ids]);
                        log.emergency({
                            title: 'data',
                            details: JSON.stringify(data)
                        });
                        log.audit({
                            title: 'data.values',
                            details: JSON.stringify(data.values)
                        });

                        var webhookConsultado = data.recordType;
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
                        log.audit({
                            title: 'response.data.code',
                            details: JSON.stringify(response.data.code)
                        });
                        if (response.data.code == 200) {
                            objupdate.custbody_drt_nc_pendiente_enviar = false;
                        }
                        objupdate.custbody_drt_nc_notificacion_registro = JSON.stringify(data);

                    } catch (error) {
                        log.error({
                            title: 'error reduce',
                            details: JSON.stringify(error)
                        });
                    } finally {
                        log.audit({
                            title: 'objupdate',
                            details: JSON.stringify(objupdate)
                        });
                        if (Object.keys(objupdate).length > 0 &&
                            data.recordType &&
                            data.id
                        ) {
                            var idUpdate = record.submitFields({
                                type: data.recordType,
                                id: data.id,
                                values: objupdate,
                                options: {
                                    enableSourcing: true,
                                    ignoreMandatoryFields: true
                                }
                            });
                        }
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