/**
 * drt_cn_lib.js
 * @NApiVersion 2.x
 * @NModuleScope public
 */

define([
        'N/log',
        'N/search',
        'N/record',
        'N/https',
        'N/format'
    ],
    function (
        log,
        search,
        record,
        https,
        format
    ) {

        function searchRecord(param_type, param_filters, param_column) {
            try {
                var respuesta = {
                    success: false,
                    data: {},
                    error: {}
                };
                /*
                 param_filters=[
                    ['isinactive', search.Operator.IS, 'F']
                ];
                param_column=[
                        { name: 'name' }
                ]
                 */
                if (param_type &&
                    param_filters &&
                    param_column
                ) {

                    var result = search.create({
                        type: param_type,
                        filters: param_filters,
                        columns: param_column
                    });
                    var resultData = result.run();
                    var start = 0;
                    do {
                        var resultSet = resultData.getRange(start, start + 1000);
                        if (resultSet && resultSet.length > 0) {
                            for (var i = 0; i < resultSet.length; i++) {
                                //                            log.audit({ title: 'resultSet[' + i + ']', details: JSON.stringify(resultSet[i]) });
                                if (!respuesta.data[resultSet[i].id]) {
                                    respuesta.data[resultSet[i].id] = {
                                        id: resultSet[i].id,
                                    };
                                    for (var column in param_column) {
                                        respuesta.data[resultSet[i].id][param_column[column].name] = resultSet[i].getValue(param_column[column]) || ''
                                    }
                                }
                            }
                        }
                        start += 1000;
                    } while (resultSet && resultSet.length == 1000);
                }
                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.error({
                    title: 'error searchRecord',
                    details: JSON.stringify(error)
                });
                respuesta.error = error;
            } finally {
                log.audit({
                    title: 'respuesta searchRecord',
                    details: respuesta
                });
                return respuesta;
            }
        }

        function createRecord(param_type, param_field_value, param_obj_sublist, param_obj_subrecord) {
            try {
                var respuesta = {
                    success: false,
                    data: '',
                    error: {}
                };
                // var param_obj_sublist= {
                //     item:[
                //         {
                //             item:5,
                //             price:3,
                //         }
                //     ]
                // }
                // {
                //     addressbook:{
                //         addr1:'Calle',
                //         addr2:'Numero Interior',
                //         addr3:'Numero Exterior',
                //         zip:'Zip',
                //         addressee:'Nombre',
                //         city:'city',
                //         country:'MX',
                //         state:'HGO',
                //     }
                // }
                log.audit({
                    title: 'param_type',
                    details: JSON.stringify(param_type)
                });
                log.audit({
                    title: 'param_field_value',
                    details: JSON.stringify(param_field_value)
                });
                log.audit({
                    title: 'param_obj_sublist',
                    details: JSON.stringify(param_obj_sublist)
                });
                log.audit({
                    title: 'param_obj_subrecord',
                    details: JSON.stringify(param_obj_subrecord)
                });
                var newRecord = record.create({
                    type: param_type,
                    isDynamic: true
                });

                for (var field in param_field_value) {
                    newRecord.setValue({
                        fieldId: field,
                        value: param_field_value[field]
                    });
                }

                for (var sublist in param_obj_sublist) {
                    for (var element in param_obj_sublist[sublist]) {
                        newRecord.selectNewLine({
                            sublistId: sublist
                        });
                        for (var field in param_obj_sublist[sublist][element]) {
                            newRecord.setCurrentSublistValue({
                                sublistId: sublist,
                                fieldId: field,
                                value: param_obj_sublist[sublist][element][field]
                            });
                        }
                        newRecord.commitLine({
                            sublistId: sublist
                        });
                    }
                }

                for (var sublist in param_obj_subrecord) {
                    log.audit({
                        title: 'sublist',
                        details: JSON.stringify(sublist)
                    });
                    newRecord.selectNewLine({
                        sublistId: sublist
                    }); //addressbook
                    newRecord.setCurrentSublistValue({
                        sublistId: sublist,
                        fieldId: 'label',
                        value: 'DRT NC - Address'
                    });
                    var subrec = newRecord.getCurrentSublistSubrecord({
                        sublistId: sublist,
                        fieldId: 'addressbookaddress'
                    });
                    for (var field in param_obj_subrecord[sublist]) {
                        log.audit({
                            title: 'param_obj_subrecord[' + sublist + '][' + field + ']',
                            details: JSON.stringify(param_obj_subrecord[sublist][field])
                        });
                        subrec.setValue({
                            fieldId: field,
                            value: param_obj_subrecord[sublist][field]
                        });
                    }
                    newRecord.commitLine({
                        sublistId: sublist
                    });
                }

                respuesta.data = newRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }) || '';

                respuesta.success = respuesta.data != '';
            } catch (error) {
                log.error({
                    title: 'error createRecord',
                    details: JSON.stringify(error)
                });
                respuesta.error = error;
            } finally {
                log.audit({
                    title: 'respuesta createRecord',
                    details: respuesta
                });
                return respuesta;
            }
        }

        function submitRecord(param_type, param_id, param_field_value) {
            try {
                var respuesta = {
                    success: false,
                    data: '',
                    error: {}
                };
                respuesta.data = record.submitFields({
                    type: param_type,
                    id: param_id,
                    values: param_field_value,
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });


                respuesta.success = respuesta.data != '';
            } catch (error) {
                log.error({
                    title: 'error submitRecord',
                    details: JSON.stringify(error)
                });
                respuesta.error = error;
            } finally {
                log.audit({
                    title: 'respuesta submitRecord',
                    details: respuesta
                });
                return respuesta;
            }
        }

        function loadsearch(param_idsearch, param_array_data) {
            try {
                var respuesta = {
                    success: false,
                    data: {}
                }
                log.audit({
                    title: 'param_idsearch',
                    details: JSON.stringify(param_idsearch)
                });
                log.audit({
                    title: 'param_array_data',
                    details: JSON.stringify(param_array_data)
                });
                var mySearch = search.load({
                    id: param_idsearch
                });
                for (var fild in param_array_data) {
                    mySearch.columns.push(
                        search.createColumn(
                            param_array_data[fild]
                        )
                    );
                }

                log.audit({
                    title: 'mySearch.columns',
                    details: JSON.stringify(mySearch.columns)
                });
                mySearch.run().each(function (result) {
                    if (!respuesta.data[result.id]) {
                        respuesta.data[result.id] = {
                            id: result.id || ""
                        };
                    }
                    for (var fild in param_array_data) {
                        if (!param_array_data[fild].join) {
                            respuesta.data[result.id][param_array_data[fild].name] = result.getValue(
                                param_array_data[fild]
                            ) || "";
                        } else {
                            var idSub = result.getValue({
                                name: "internalid",
                                join: "inventoryNumber",
                            }) || '';
                            if (idSub) {
                                if (!respuesta.data[result.id][param_array_data[fild].join]) {
                                    respuesta.data[result.id][param_array_data[fild].join] = {}
                                }
                                if (!respuesta.data[result.id][param_array_data[fild].join][idSub]) {
                                    respuesta.data[result.id][param_array_data[fild].join][idSub] = {}
                                }

                                respuesta.data[result.id][param_array_data[fild].join][idSub][param_array_data[fild].name] = result.getValue(
                                    param_array_data[fild]
                                ) || "";
                            }

                        }

                    }
                    return true;
                });
                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.audit({
                    title: "error loadsearch",
                    details: error
                })
            } finally {
                log.audit({
                    title: 'respuesta loadsearch',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function responseYuhu(param_id_registro) {
            try {
                log.audit({
                    title: 'param_id_registro',
                    details: JSON.stringify(param_id_registro)
                });
                var respuesta = {
                    success: false,
                    record: '',
                    error: [],
                    data: {
                        // 116: {
                        //     "record_type": "SALES_ORDER",
                        //     "internal_id": "116",
                        //     "folio": 'nombre_transaccion',
                        //     "total": 0,
                        //     "custbody_drt_nc_identificador_uuid": "",
                        //     "custbody_drt_nc_identificador_folio": '',
                        //     "trandate": '',
                        //     "datecreated": ''
                        // },
                        // 3: {
                        //     "record_type": "CUSTOMER",
                        //     "internal_id": "3",
                        //     "custentity_mx_rfc": "rfc",
                        //     "custentity_drt_nc_curp": "",
                        // }
                    }
                };

                if (param_id_registro) {
                    respuesta.record = param_id_registro;
                    var recordConect = search.lookupFields({
                        type: 'customrecord_drt_nc_conect',
                        id: param_id_registro,
                        columns: [
                            'custrecord_drt_nc_c_procesando',
                            'custrecord_drt_nc_c_terminado',
                            'custrecord_drt_nc_c_resultado',
                            'custrecord_drt_nc_c_error',
                            'custrecord_drt_nc_c_transaccion',
                            'custrecord_drt_nc_c_entity',
                        ]
                    }) || '';
                    log.audit({
                        title: 'recordConect',
                        details: JSON.stringify(recordConect)
                    });
                    if (recordConect) {
                        if (recordConect.custrecord_drt_nc_c_procesando) {
                            respuesta.data.procesando = recordConect.custrecord_drt_nc_c_procesando;
                        }
                        if (recordConect.custrecord_drt_nc_c_terminado) {
                            respuesta.data.terminado = recordConect.custrecord_drt_nc_c_terminado;
                        }
                        if (recordConect.custrecord_drt_nc_c_resultado) {
                            respuesta.data.resultado = recordConect.custrecord_drt_nc_c_resultado;
                        }
                        if (recordConect.custrecord_drt_nc_c_error) {
                            respuesta.data.error = recordConect.custrecord_drt_nc_c_error;
                        }
                        if (recordConect.custrecord_drt_nc_c_transaccion && recordConect.custrecord_drt_nc_c_transaccion[0] && recordConect.custrecord_drt_nc_c_transaccion[0].value) {
                            var transaccionLookup = search.lookupFields({
                                type: search.Type.TRANSACTION,
                                id: recordConect.custrecord_drt_nc_c_transaccion[0].value,
                                columns: [
                                    'tranid',
                                    'total',
                                    'custbody_drt_nc_identificador_uuid',
                                    'custbody_drt_nc_identificador_folio',
                                    'trandate',
                                    'datecreated',
                                ]
                            }) || '';
                            respuesta.data.SALES_ORDER = {};
                            respuesta.data.SALES_ORDER.id = recordConect.custrecord_drt_nc_c_transaccion[0].value || '';
                            respuesta.data.SALES_ORDER.tranid = transaccionLookup.tranid || '';
                            respuesta.data.SALES_ORDER.total = transaccionLookup.total || '';
                            respuesta.data.SALES_ORDER.custbody_drt_nc_identificador_uuid = transaccionLookup.custbody_drt_nc_identificador_uuid || '';
                            respuesta.data.SALES_ORDER.custbody_drt_nc_identificador_folio = transaccionLookup.custbody_drt_nc_identificador_folio || '';
                            respuesta.data.SALES_ORDER.trandate = transaccionLookup.trandate || '';
                            respuesta.data.SALES_ORDER.datecreated = transaccionLookup.datecreated || '';
                        }
                        if (recordConect.custrecord_drt_nc_c_entity && recordConect.custrecord_drt_nc_c_entity[0] && recordConect.custrecord_drt_nc_c_entity[0].value) {
                            var entityLookup = search.lookupFields({
                                type: search.Type.CUSTOMER,
                                id: recordConect.custrecord_drt_nc_c_entity[0].value,
                                columns: [
                                    'custentity_mx_rfc',
                                    'custentity_drt_nc_curp',
                                ]
                            }) || '';
                            respuesta.data.CUSTOMER = {};
                            respuesta.data.CUSTOMER.id = recordConect.custrecord_drt_nc_c_entity[0].value;
                            respuesta.data.CUSTOMER.custentity_mx_rfc = entityLookup.custentity_mx_rfc;
                            respuesta.data.CUSTOMER.custentity_drt_nc_curp = entityLookup.custentity_drt_nc_curp;
                        }
                    } else {
                        respuesta.data = {};
                        respuesta.data.message = 'Invalid Action.';
                    }
                } else {
                    respuesta.data = {};
                    respuesta.data.message = 'Invalid Action.';
                }

                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.error({
                    title: 'error responseYuhu',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta responseYuhu',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function bookWebhook(param_case) {
            try {
                var respuesta = {
                    success: false,
                    data: {},
                    ejemplo: {},
                };
                log.audit({
                    title: 'bookWebhook',
                    details: JSON.stringify(param_case)
                });
                switch (param_case) {
                    case 'salesorder': //credito_inicial
                        respuesta.data.header = {
                            "Authorization": "Api-Key Moa1M0rL.9XK5Z5qAyFcG2hH1N9dBPghwrfDkAmFc",
                            "Content-Type": "application/json"
                        };
                        respuesta.data.url = 'https://apidev.yuhu.mx/api/v1/ns/webhook/salesorder/';
                        respuesta.data.ejemplo = {
                            "success": true,
                            "record": "2001",
                            "error": [],
                            "data": {
                                "1892": {
                                    "recordtype": "salesorder",
                                    "internalid": "1892",
                                    "folio": "86",
                                    "total": 48653.86,
                                    "trandate": "2020-06-19",
                                    "createddate": "2020-06-19",
                                    "custbody_drt_nc_identificador_uuid": "ab2009f4-1dba-4990-8d67-5eb8f70fb671",
                                    "custbody_drt_nc_identificador_folio": "CRT7002240"
                                },
                                "115": {
                                    "recordtype": "customer",
                                    "internalid": "115",
                                    "custentity_mx_rfc": "EIIF920502751",
                                    "custentity_drt_nc_curp": "EIIF920502HNLSRR00",
                                    "uuid_yuhu": "7b6ad1a1-638b-4cd2-938f-498149dced58"
                                }
                            }
                        };
                        break;
                    case 'maturities-receivable': //vencimiento_por_cobrar
                        respuesta.data.header = {
                            "Authorization": "Api-Key Moa1M0rL.9XK5Z5qAyFcG2hH1N9dBPghwrfDkAmFc",
                            "Content-Type": "application/json"
                        };
                        respuesta.data.url = 'https://apidev.yuhu.mx/api/v1/ns/webhook/maturities-receivable/';
                        respuesta.data.ejemplo = {
                            "success": true,
                            "record": "2001",
                            "error": [],
                            "case": "",
                            "data": {
                                "116": {
                                    "recordtype": "invoice",
                                    "internalid": "116",
                                    "folio": "nombre_folio_transaccion",
                                    "total": 2027.24,
                                    "trandate": "2020-05-30",
                                    "createddate": "2020-05-30",
                                    "num_amortizacion": "1",
                                    "custbody_drt_nc_tipo_descuento": "0",
                                    "empresa_custentity_mx_rfc": "FERE920115V20",
                                    "empresa_companyname": "fereicode sa de cv",
                                    "custbody_mx_cfdi_uuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                                    "custbody_drt_nc_identificador_uuid": "ab2009f4-1dba-4990-8d67-5eb8f70fb671",
                                    "custbody_drt_nc_identificador_folio": "CRT7002240"
                                }
                            }
                        }

                        break;
                    case 'update-credit': //actualiza_saldo_credito
                        respuesta.data.header = {
                            "Authorization": "Api-Key Moa1M0rL.9XK5Z5qAyFcG2hH1N9dBPghwrfDkAmFc",
                            "Content-Type": "application/json"
                        };
                        respuesta.data.url = 'https://apidev.yuhu.mx/api/v1/ns/webhook/update-credit/';
                        respuesta.data.ejemplo = {
                            "success": true,
                            "record": "2001",
                            "error": [],
                            "data": {
                                "116": {
                                    "recordtype": "customerpayment",
                                    "internalid": "116",
                                    "folio": "nombre_transaccion",
                                    "total": 24000.00,
                                    "trandate": "2020-05-31",
                                    "createddate": "2020-05-31",
                                    "num_amortizacion": "1",
                                    "custbody_drt_nc_identificador_uuid": "ab2009f4-1dba-4990-8d67-5eb8f70fb671",
                                    "custbody_drt_nc_identificador_folio": "CRT7002240"
                                },
                                "115": {
                                    "recordtype": "customer",
                                    "internalid": "115",
                                    "custentity_drt_nc_curp": "CAGG780421HCLHLB05",
                                    "custentity_drt_nc_uuid_yuhu": 'c9d71dcc-aceb-4d99-8ccd-63c97df9f9e6',
                                    "custentity_mx_rfc": "CAGG780421NM1"
                                }
                            }
                        };
                        break;
                    case 'outstanding-balance': //saldo_pendiente_aplicar
                        respuesta.data.header = {
                            "Authorization": "Api-Key Moa1M0rL.9XK5Z5qAyFcG2hH1N9dBPghwrfDkAmFc",
                            "Content-Type": "application/json"
                        };
                        respuesta.data.url = 'https://apidev.yuhu.mx/api/v1/ns/webhook/outstanding-balance/';
                        respuesta.data.ejemplo = {
                            "success": true,
                            "record": "",
                            "error": [],
                            "case": "",
                            "data": {
                                "120": {
                                    "recordtype": "invoice",
                                    "internalid": "120",
                                    "folio": "nombre_transaccion",
                                    "total": 2000,
                                    "trandate": "1/06/2020",
                                    "createddate": "1/06/2020",
                                    "custbody_drt_nc_tipo_descuento": "0",
                                    "empresa_custentity_mx_rfc": "FERE920115V20",
                                    "empresa_companyname": "fereicode sa de cv",
                                    "custbody_mx_cfdi_uuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                                    "num_amortizacion": "4",
                                    "custbody_drt_nc_identificador_uuid": "ab2009f4-1dba-4990-8d67-5eb8f70fb671",
                                    "custbody_drt_nc_identificador_folio": "CRT7002240"
                                },
                                "335": {
                                    "recordtype": "customerpayment",
                                    "internalid": "335",
                                    "folio": "nombre_transaccion",
                                    "total": 2300,
                                    "trandate": "1/06/2020",
                                    "createddate": "1/06/2020",
                                    "custbody_drt_nc_tipo_descuento": "0",
                                    "empresa_custentity_mx_rfc": "FERE920115V20",
                                    "empresa_companyname": "fereicode sa de cv",
                                    "num_amortizacion": "4",
                                    "custbody_drt_nc_identificador_uuid": "ab2009f4-1dba-4990-8d67-5eb8f70fb671",
                                    "custbody_drt_nc_identificador_folio": "CRT7002240"
                                },
                                "336": {
                                    "recordtype": "journalentry",
                                    "internalid": "336",
                                    "folio": "nombre_transaccion",
                                    "total": 2300,
                                    "trandate": "1/06/2020",
                                    "createddate": "1/06/2020",
                                    "custbody_drt_nc_tipo_descuento": "0",
                                    "empresa_custentity_mx_rfc": "FERE920115V20",
                                    "empresa_companyname": "fereicode sa de cv",
                                    "num_amortizacion": "4",
                                    "custbody_drt_nc_identificador_uuid": "ab2009f4-1dba-4990-8d67-5eb8f70fb671",
                                    "custbody_drt_nc_identificador_folio": "CRT7002240"
                                }
                            }
                        };
                        break;

                    default:
                        break;
                }
                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.error({
                    title: 'error bookWebhook',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta bookWebhook',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function postWebhook(param_header, param_url, param_body) {
            try {
                var respuesta = {
                    success: false,
                    data: {
                        code: 0,
                        body: ''
                    }
                };
                respuesta.data = https.post({
                    headers: param_header,
                    url: param_url,
                    body: JSON.stringify(param_body),
                }) || {
                    code: 0
                };
                respuesta.success = respuesta.data.code == 200;
            } catch (error) {
                log.error({
                    title: 'error postWebhook',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta postWebhook ',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function updateYuhu(param_context) {
            try {
                var respuesta = {
                    success: false,
                    data: '',
                    error: []
                };
                log.audit({
                    title: 'updateYuhu param_context',
                    details: JSON.stringify(param_context)
                });

                if (param_context && param_context.recordtype && param_context.id) {

                    if (Object.keys(param_context.body).length > 0) {
                        var newRecord = record.load({
                            type: param_context.recordtype,
                            id: param_context.id,
                            isDynamic: true
                        });

                        for (var field in param_context.body) {
                            newRecord.setValue({
                                fieldId: field,
                                value: param_context.body[field]
                            });
                        }

                        respuesta.data = newRecord.save({
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }) || '';

                    } else {
                        respuesta.error.push('Es necesaria informacion para actualizar {id:valor} ' + JSON.stringify(param_context.body));
                    }
                } else {
                    respuesta.error.push('Es necesario id ' + param_context.id + ' y recordtype ' + param_context.recordtype);
                }

                respuesta.success = respuesta.data != '';
            } catch (error) {
                log.error({
                    title: 'error updateYuhu',
                    details: JSON.stringify(error)
                });
                respuesta.error.push('Error: ' + JSON.stringify(error));

            } finally {
                log.emergency({
                    title: 'respuesta updateYuhu ',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function formatDate(param_fecha, separador_destino, lugar_año, luigar_mes, lugar_dia, hora) {
            var respuesta = '';
            try {
                var objDate = format.parse({
                    value: param_fecha,
                    type: format.Type.DATE
                });

                var año = objDate.getFullYear() || '';
                var mes = objDate.getMonth() || '';
                var dia = objDate.getDate() || '';
                var arrayFecha = ['', '', '', ];
                arrayFecha[lugar_año] = año;
                arrayFecha[luigar_mes] = mes * 1 + 1 < 10 ? '0' + (mes * 1 + 1) : mes * 1 + 1;
                arrayFecha[lugar_dia] = dia < 10 ? '0' + dia : dia;

                log.audit({
                    title: 'fecha1',
                    details: ' objDate ' + objDate +
                        ' año ' + año +
                        ' mes ' + mes +
                        ' dia ' + dia
                });
                respuesta = arrayFecha[0] + separador_destino + arrayFecha[1] + separador_destino + arrayFecha[2] + hora;
            } catch (error) {
                log.error({
                    title: 'error fechaSplit',
                    details: JSON.stringify(error)
                });
                respuesta = '';
            } finally {
                log.audit({
                    title: 'respuesta fechaSplit',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        return {
            searchRecord: searchRecord,
            createRecord: createRecord,
            submitRecord: submitRecord,
            loadsearch: loadsearch,
            responseYuhu: responseYuhu,
            postWebhook: postWebhook,
            bookWebhook: bookWebhook,
            updateYuhu: updateYuhu,
            formatDate: formatDate
        }
    });