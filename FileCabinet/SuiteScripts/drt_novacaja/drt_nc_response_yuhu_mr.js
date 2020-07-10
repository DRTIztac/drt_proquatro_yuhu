/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './drt_cn_lib', 'N/runtime', 'N/format'],
    function (search, record, drt_cn_lib, runtime, format) {

        function getInputData() {
            try {
                var respuesta = search.create({
                    type: search.Type.TRANSACTION,
                    columns: [
                        //Campos Nativos
                        search.createColumn({
                            name: 'entity'
                        }),
                        search.createColumn({
                            name: 'total'
                        }),
                        search.createColumn({
                            name: 'title'
                        }),
                        search.createColumn({
                            name: 'trandate'
                        }),
                        search.createColumn({
                            name: 'title'
                        }),
                        //Campos Conexion por transaccion
                        search.createColumn({
                            name: 'custbody_drt_nc_con_cp'
                        }),
                        search.createColumn({
                            name: 'custbody_drt_nc_con_cs'
                        }),
                        search.createColumn({
                            name: 'custbody_drt_nc_con_in'
                        }),
                        search.createColumn({
                            name: 'custbody_drt_nc_con_je'
                        }),
                        search.createColumn({
                            name: 'custbody_drt_nc_con_so'
                        }),
                        //Campos Customm
                        search.createColumn({
                            name: 'custbody_drt_nc_notificacion_registro'
                        }),
                        search.createColumn({
                            name: 'custbody_drt_nc_identificador_folio'
                        }),
                        search.createColumn({
                            name: 'custbody_drt_nc_identificador_uuid'
                        }),
                        search.createColumn({
                            name: 'custbody_drt_nc_folio_sustitucion'
                        }),
                        //Cammpos Opcionales
                        search.createColumn({
                            name: 'custbody_drt_nc_num_amortizacion'
                        }),
                        search.createColumn({
                            name: 'custbody_drt_nc_tipo_descuento'
                        }),
                        search.createColumn({
                            name: 'custbody_drt_nc_tipo_pago'
                        })
                    ],
                    filters: [
                        [
                            ['recordtype', search.Operator.IS, search.Type.INVOICE],
                            'and',
                            ['custbody_drt_nc_con_in', search.Operator.IS, search.Operator.ANYOF, '@NONE@']
                        ],
                        'or',
                        [
                            ['recordtype', search.Operator.IS, search.Type.CUSTOMER_PAYMMENT],
                            'and',
                            ['custbody_drt_nc_con_cp', search.Operator.IS, search.Operator.ANYOF, '@NONE@']
                        ],
                        'or',
                        [
                            ['recordtype', search.Operator.IS, search.Type.CASH_SALE],
                            'and',
                            ['custbody_drt_nc_con_cs', search.Operator.IS, search.Operator.ANYOF, '@NONE@']
                        ],
                        'and',
                        ['custbody_drt_nc_notificacion_registro', search.Operator.IS, search.Operator.ISEMPTY, ""]
                    ]
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


                        var mensajeFinal = [];
                        switch (data.recordType) {
                            case 'salesorder': {

                            }
                            break;

                        default:
                            mensajeFinal.push('Transaccion no valida: ' + data.recordType);
                            break;
                        }



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