/**
 * drt_cn_lib.js
 * @NApiVersion 2.x
 * @NModuleScope public
 */

define([
        'N/transaction',
        'N/log',
        'N/search',
        'N/record',
        'N/http',
        'N/https',
        'N/format',
        'N/runtime'
    ],
    function (
        transaction,
        log,
        search,
        record,
        http,
        https,
        format,
        runtime
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
                    title: 'createRecord',
                    details: ' param_type: ' + param_type +
                        ' param_field_value: ' + JSON.stringify(param_field_value) +
                        ' param_obj_sublist: ' + JSON.stringify(param_obj_sublist) +
                        ' param_obj_subrecord: ' + JSON.stringify(param_obj_subrecord)
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

                var objDefaul = {};
                if (param_type == record.Type.INVOICE) {
                    objDefaul.custbody_psg_ei_template = 9;
                    objDefaul.custbody_psg_ei_status = 1;
                    objDefaul.custbody_edoc_gen_trans_pdf = true;
                    objDefaul.custbody_mx_cfdi_usage = 22;
                    objDefaul.custbody_mx_txn_sat_payment_method = 3;
                    objDefaul.custbody_mx_txn_sat_payment_term = 3;
                } else if (param_type == record.Type.CASH_SALE) {
                    objDefaul.custbody_psg_ei_template = 7;
                    objDefaul.custbody_psg_ei_status = 1;
                    objDefaul.custbody_edoc_gen_trans_pdf = true;
                    objDefaul.custbody_mx_cfdi_usage = 22;
                    objDefaul.custbody_mx_txn_sat_payment_method = 3;
                    objDefaul.custbody_mx_txn_sat_payment_term = 3;
                }
                log.audit({
                    title: 'objDefaul',
                    details: JSON.stringify(objDefaul)
                });
                for (var field_id in objDefaul) {
                    newRecord.setValue({
                        fieldId: field_id,
                        value: objDefaul[field_id]
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
                log.audit({
                    title: 'submitRecord',
                    details: ' param_type: ' + param_type +
                        ' param_id: ' + param_id +
                        ' param_field_value: ' + JSON.stringify(param_field_value)
                });
                if (param_type && param_id && Object.keys(param_field_value).length > 0) {
                    respuesta.data = record.submitFields({
                        type: param_type,
                        id: param_id,
                        values: param_field_value,
                        options: {
                            enableSourcing: false,
                            ignoreMandatoryFields: true
                        }
                    });
                }

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
                var apykey = runtime.getCurrentScript().getParameter({
                    name: 'custscript_drt_nc_apykey'
                }) || '';
                var url = runtime.getCurrentScript().getParameter({
                    name: 'custscript_drt_nc_url'
                }) || '';

                respuesta.data.header = {
                    "Authorization": apykey, //"Api-Key PjAmZ2Sq.vO3FJtxnejCy20kNUBDZ0r3KZ1L8th5Q",
                    "Content-Type": "application/json"
                };
                respuesta.data.url = url;

                respuesta.data.ejemplo = {};

                switch (param_case) {
                    case 'salesorder':
                        respuesta.data.url += param_case + '/';
                        break;

                    case 'invoice':
                        respuesta.data.url += param_case + '/';
                        break;

                    case 'customerpayment':
                        respuesta.data.url += param_case + '/';
                        break;

                    case 'journalentry':
                        respuesta.data.url += param_case + '/';
                        break;

                    case 'cashsale':
                        respuesta.data.url += param_case + '/';
                        break;
                    case 'customer':
                        respuesta.data.url += param_case + '/';
                        break;
                    case 'error':
                        respuesta.data.url += param_case + '/';
                        break;


                    default:
                        break;
                }
                respuesta.success = apykey != '' && url != '';
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
                if (param_header && param_url && param_body) {
                    log.audit({
                        title: 'postWebhook param_header',
                        details: JSON.stringify(param_header)
                    });
                    log.audit({
                        title: 'postWebhook param_url',
                        details: JSON.stringify(param_url)
                    });
                    log.audit({
                        title: 'postWebhook param_body',
                        details: JSON.stringify(param_body)
                    });
                    var is_https = runtime.getCurrentScript().getParameter({
                        name: 'custscript_drt_nc_https'
                    }) || '';

                    log.audit({
                        title: 'is_https',
                        details: JSON.stringify(is_https)
                    });

                    if (is_https) {
                        respuesta.data = https.post({
                            headers: param_header,
                            url: param_url,
                            body: JSON.stringify(param_body),
                        }) || {
                            code: 0
                        };

                    } else {
                        respuesta.data = http.post({
                            headers: param_header,
                            url: param_url,
                            body: JSON.stringify(param_body),
                        }) || {
                            code: 0
                        };
                    }
                }
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
                if (param_context.recordType && param_context.id) {
                    if (Object.keys(param_context.body).length > 0) {
                        var newRecord = record.load({
                            type: param_context.recordType,
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
                    respuesta.error.push('Es necesario id ' + param_context.id + ' y recordType ' + param_context.recordType);
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

        function lookup(param_type, param_id, param_columns) {
            try {
                var respuesta = {
                    success: false,
                    data: {},
                    error: {}
                };
                log.audit({
                    title: 'lookup',
                    details: ' param_type: ' + param_type +
                        ' param_id: ' + param_id +
                        ' param_columns: ' + param_columns
                });
                if (param_type && param_id && param_columns.length > 0) {

                    respuesta.data = search.lookupFields({
                        type: param_type,
                        id: param_id,
                        columns: param_columns
                    }) || '';
                    respuesta.success = Object.keys(respuesta.data).length > 0;
                } else {
                    respuesta.error.message =
                        'Falta Informacion ' +
                        ' *type: ' + param_type +
                        ' *id: ' + param_id +
                        ' *columns: ' + param_columns;
                }
            } catch (error) {
                log.error({
                    title: 'error lookup',
                    details: JSON.stringify(error)
                });
                respuesta.error = error;
            } finally {
                log.emergency({
                    title: 'respuesta lookup',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function updateSalesOrder(param_id, param_sublist, param_total, param_transaction) {
            try {
                var respuesta = {
                    success: false,
                    data: ''
                };
                log.audit({
                    title: 'updateSalesOrder',
                    details: ' param_id: ' + param_id +
                        ' param_sublist: ' + JSON.stringify(param_sublist) +
                        ' param_total: ' + param_total +
                        ' param_transaction: ' + param_transaction
                });
                if (param_id) {
                    var newRecord = record.load({
                        type: record.Type.SALES_ORDER,
                        id: param_id,
                        isDynamic: true
                    });
                    var memo = '';
                    if (param_sublist) {
                        memo = 'Actualizacion de credito por ' + param_transaction;
                    } else if (param_total) {
                        memo = 'Se paga todo el credito en' + param_transaction;
                    } else {
                        memo = 'Se genera mora ' + param_transaction;
                    }
                    var sublist = 'item';
                    var numLines = newRecord.getLineCount({
                        sublistId: sublist
                    }) || 0;

                    for (var line = 0; line < numLines; line++) {
                        newRecord.selectLine({
                            sublistId: sublist,
                            line: line
                        });

                        var num_amortizacion = newRecord.getCurrentSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_drt_nc_num_amortizacion',
                        }) || '';
                        var rate = newRecord.getCurrentSublistValue({
                            sublistId: sublist,
                            fieldId: 'rate',
                        }) || '';
                        var quantitybilled = newRecord.getCurrentSublistValue({
                            sublistId: sublist,
                            fieldId: 'quantitybilled',
                        }) || '0';
                        var facturado = newRecord.getCurrentSublistValue({
                            sublistId: sublist,
                            fieldId: 'custcol_drt_nc_facturado',
                        }) || '';
                        log.audit({
                            title: 'line',
                            details: ' num_amortizacion: ' + num_amortizacion +
                                ' rate: ' + rate +
                                ' quantitybilled: ' + quantitybilled +
                                ' facturado: ' + facturado
                        });
                        if (num_amortizacion && !facturado /* && parseInt(quantitybilled) == 0 */ ) {
                            if (param_sublist.length > 0 && !param_total) {
                                for (var articulo = 0; articulo < param_sublist.length; articulo++) {
                                    if (param_sublist[articulo].num_amortizacion == num_amortizacion) {
                                        memo +=
                                            ' *custcol_drt_nc_num_amortizacion Antes: ' +
                                            newRecord.getCurrentSublistValue({
                                                sublistId: sublist,
                                                fieldId: 'custcol_drt_nc_num_amortizacion',
                                            }) +
                                            ' despues: ' + param_sublist[articulo].num_amortizacion +
                                            ' *custcol_drt_nc_monto_total Antes: ' +
                                            newRecord.getCurrentSublistValue({
                                                sublistId: sublist,
                                                fieldId: 'custcol_drt_nc_monto_total',
                                            }) +
                                            ' despues: ' + param_sublist[articulo].total +
                                            ' *custcol_drt_nc_monto_interes Antes: ' +
                                            newRecord.getCurrentSublistValue({
                                                sublistId: sublist,
                                                fieldId: 'custcol_drt_nc_monto_interes',
                                            }) +
                                            ' despues: ' + param_sublist[articulo].interes +
                                            '* custcol_drt_nc_monto_capital Antes: ' +
                                            newRecord.getCurrentSublistValue({
                                                sublistId: sublist,
                                                fieldId: 'custcol_drt_nc_monto_capital',
                                            }) +
                                            ' despues: ' + param_sublist[articulo].capital +
                                            '* custcol_drt_nc_monto_iva Antes: ' +
                                            newRecord.getCurrentSublistValue({
                                                sublistId: sublist,
                                                fieldId: 'custcol_drt_nc_monto_iva',
                                            }) +
                                            ' despues: ' + param_sublist[articulo].iva +
                                            '* rate Antes: ' + rate +
                                            ' despues: ' + param_sublist[articulo].interes;
                                        if (param_sublist[articulo].custcol_drt_nc_fecha_vencimiento) {
                                            newRecord.setCurrentSublistValue({
                                                sublistId: sublist,
                                                fieldId: 'custcol_drt_nc_fecha_vencimiento',
                                                value: format.parse({
                                                    value: param_sublist[articulo].custcol_drt_nc_fecha_vencimiento,
                                                    type: format.Type.DATE
                                                })
                                            });
                                        }
                                        if (param_sublist[articulo].fecha) {
                                            newRecord.setCurrentSublistValue({
                                                sublistId: sublist,
                                                fieldId: 'custcol_drt_nc_fecha',
                                                value: format.parse({
                                                    value: param_sublist[articulo].fecha,
                                                    type: format.Type.DATE
                                                })
                                            });
                                        }
                                        newRecord.setCurrentSublistValue({
                                            sublistId: sublist,
                                            fieldId: 'custcol_drt_nc_fecha',
                                            value: format.parse({
                                                value: param_sublist[articulo].fecha,
                                                type: format.Type.DATE
                                            })
                                        });
                                        newRecord.setCurrentSublistValue({
                                            sublistId: sublist,
                                            fieldId: 'custcol_drt_nc_monto_total',
                                            value: param_sublist[articulo].total
                                        });
                                        newRecord.setCurrentSublistValue({
                                            sublistId: sublist,
                                            fieldId: 'custcol_drt_nc_monto_interes',
                                            value: param_sublist[articulo].interes
                                        });
                                        newRecord.setCurrentSublistValue({
                                            sublistId: sublist,
                                            fieldId: 'custcol_drt_nc_num_amortizacion',
                                            value: param_sublist[articulo].num_amortizacion
                                        });
                                        newRecord.setCurrentSublistValue({
                                            sublistId: sublist,
                                            fieldId: 'custcol_drt_nc_monto_capital',
                                            value: param_sublist[articulo].capital
                                        });
                                        newRecord.setCurrentSublistValue({
                                            sublistId: sublist,
                                            fieldId: 'custcol_drt_nc_monto_iva',
                                            value: param_sublist[articulo].iva
                                        });
                                        newRecord.setCurrentSublistValue({
                                            sublistId: sublist,
                                            fieldId: 'rate',
                                            value: param_sublist[articulo].interes
                                        });
                                        newRecord.commitLine({
                                            sublistId: sublist
                                        });
                                    }
                                }
                            } else if (param_total) {
                                {
                                    memo +=
                                        ' *rate Antes: ' +
                                        newRecord.getCurrentSublistValue({
                                            sublistId: sublist,
                                            fieldId: 'rate',
                                        }) +
                                        ' despues: ' + 0;
                                    // newRecord.setCurrentSublistValue({
                                    //     sublistId: sublist,
                                    //     fieldId: 'isclosed',
                                    //     value: true
                                    // }) || '';
                                    newRecord.setCurrentSublistValue({
                                        sublistId: sublist,
                                        fieldId: 'custcol_drt_nc_facturado',
                                        value: true
                                    }) || '';
                                    newRecord.setCurrentSublistValue({
                                        sublistId: sublist,
                                        fieldId: 'rate',
                                        value: 0
                                    });
                                    if (param_transaction) {
                                        newRecord.setCurrentSublistValue({
                                            sublistId: sublist,
                                            fieldId: 'custcol_drt_nc_invoice',
                                            value: param_transaction
                                        });
                                    }
                                    newRecord.commitLine({
                                        sublistId: sublist
                                    });
                                }

                            }
                        }

                    }
                    log.audit({
                        title: 'memo',
                        details: JSON.stringify(memo)
                    });
                    newRecord.setValue({
                        fieldId: 'custbody_drt_nc_memo',
                        value: memo
                    });
                    respuesta.data = newRecord.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }) || '';
                }
                respuesta.success = respuesta.data != '';
            } catch (error) {
                log.error({
                    title: 'error updateSalesOrder',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta updateSalesOrder',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function searchidentificador(param_record, param_campo, param_identificador) {
            try {
                var respuesta = {
                    success: false,
                    data: ''
                };
                log.audit({
                    title: 'searchidentificador ',
                    details: ' param_record: ' + param_record +
                        ' param_campo: ' + param_campo +
                        ' param_identificador: ' + param_identificador
                });


                if (param_record && param_campo && param_identificador) {
                    var arrayFilters = [
                        [param_campo, search.Operator.CONTAINS, param_identificador]
                    ];
                    var transactionSearchObj = search.create({
                        type: param_record,
                        filters: arrayFilters,
                        columns: [param_campo]
                    });
                    var searchResultCount = transactionSearchObj.runPaged().count;
                    transactionSearchObj.run().each(function (result) {
                        var identificador_encontrado = result.getValue({
                            name: param_campo
                        }) || '';
                        if (identificador_encontrado && identificador_encontrado == param_identificador) {
                            respuesta.data = result.id;
                            respuesta[param_campo] = result.getValue({
                                name: param_campo
                            }) || '';
                            return false;
                        }
                        return true;
                    });
                }

                respuesta.success = respuesta.data != '';
            } catch (error) {
                log.error({
                    title: 'error searchidentificador',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta searchidentificador',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }


        function voidTransaction(param_transaction, param_id) {
            try {
                var respuesta = {
                    success: false,
                    data: '',
                    message: [],
                    error: {}
                };
                log.audit({
                    title: 'voidTransaction',
                    details: ' param_transaction: ' + param_transaction +
                        ' param_id: ' + param_id
                });
                if (param_transaction && param_id) {
                    var voidJe = true;
                    if (param_transaction != record.Type.JOURNAL_ENTRY) {
                        var transaccion = lookup(param_transaction, param_id, 'custbody_drt_nc_transaccion_ajuste');
                        if (transaccion.success && transaccion.data.custbody_drt_nc_transaccion_ajuste.length > 0) {
                            var voidJe2 = voidTransaction(record.Type.JOURNAL_ENTRY, transaccion.data.custbody_drt_nc_transaccion_ajuste[0].value);
                            if (voidJe2.success) {
                                respuesta.message.push('Transaccion de impacto anulada ' + record.Type.JOURNAL_ENTRY + ' ' + transaccion.data.custbody_drt_nc_transaccion_ajuste[0].value);
                            }
                            voidJe = voidJe2.success;
                        }
                    }
                    if (voidJe) {
                        respuesta.data = transaction.void({
                            type: param_transaction, //transaction.Type.SALES_ORDER,
                            id: parseInt(param_id) //salesOrderId
                        });
                        respuesta.message.push('Transaccion solicitada anulada ' + param_transaction + ' ' + param_id);
                    }
                }
                respuesta.success = respuesta.data != '';
            } catch (error) {
                respuesta.message.push('No se pudo anular la transaccion ' + param_transaction + ' ' + param_id);
                respuesta.error = error;
                log.error({
                    title: 'error voidTransaction',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta voidTransaction',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function updateTransactionLine(param_type, param_id, sublist, param_sublist, param_field) {
            try {
                var respuesta = {
                    success: false,
                    data: '',
                    error: {}
                };
                log.audit({
                    title: 'updateSalesOrder',
                    details: ' param_id: ' + param_id +
                        ' param_type: ' + JSON.stringify(param_type) +
                        ' sublist: ' + JSON.stringify(sublist) +
                        ' param_sublist: ' + JSON.stringify(param_sublist) +
                        ' param_field: ' + JSON.stringify(param_field)
                });
                if (
                    param_id &&
                    param_type &&
                    (
                        Object.keys(param_sublist).length > 0 && sublist ||
                        Object.keys(param_sublist).length <= 0
                    ) &&
                    (
                        Object.keys(param_sublist).length > 0 ||
                        Object.keys(param_field).length > 0
                    )
                ) {
                    var newRecord = record.load({
                        type: param_type,
                        id: param_id,
                        isDynamic: true
                    });


                    for (var line in param_sublist) {
                        newRecord.selectLine({
                            sublistId: sublist,
                            line: param_sublist[line].line
                        });
                        for (var fieldIdSublist in param_sublist[line]) {
                            if (param_sublist[line][fieldIdSublist] && fieldIdSublist != 'line') {
                                log.audit({
                                    title: 'param_sublist[' + line + '][' + fieldIdSublist + ']',
                                    details: JSON.stringify(param_sublist[line][fieldIdSublist])
                                });
                                if (
                                    fieldIdSublist == 'custcol_drt_nc_fecha' ||
                                    fieldIdSublist == 'custcol_drt_nc_fecha_vencimiento'
                                ) {
                                    newRecord.setCurrentSublistValue({
                                        sublistId: sublist,
                                        fieldId: fieldIdSublist,
                                        value: format.parse({
                                            value: param_sublist[line][fieldIdSublist],
                                            type: format.Type.DATE
                                        })
                                    });

                                } else {
                                    newRecord.setCurrentSublistValue({
                                        sublistId: sublist,
                                        fieldId: fieldIdSublist,
                                        value: param_sublist[line][fieldIdSublist]
                                    });

                                }
                            }
                        }
                        newRecord.commitLine({
                            sublistId: sublist
                        });

                    }
                    for (var fieldId in param_field) {
                        log.audit({
                            title: 'param_field[' + fieldId + ']',
                            details: JSON.stringify(param_field[fieldId])
                        });
                        if (
                            fieldId == 'trandate'
                        ) {
                            newRecord.setValue({
                                fieldId: fieldId,
                                value: format.parse({
                                    value: param_field[fieldId],
                                    type: format.Type.DATE
                                })
                            });

                        } else {
                            newRecord.setValue({
                                fieldId: fieldId,
                                value: param_field[fieldId]
                            });
                        }
                    }
                    respuesta.data = newRecord.save({
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }) || '';
                } else {
                    respuesta.error = {
                        message: 'Faltan campos necesarios para la actualizacion ' +
                            ' recordType: ' + JSON.stringify(param_type) +
                            ' record: ' + param_id +
                            ' sublist: ' + JSON.stringify(param_sublist) +
                            ' field: ' + JSON.stringify(param_field)
                    };

                }
                respuesta.success = respuesta.data != '';
            } catch (error) {
                respuesta.error = error;
                log.error({
                    title: 'error updateTransactionLine',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta updateTransactionLine',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        return {
            updateTransactionLine: updateTransactionLine,
            voidTransaction: voidTransaction,
            lookup: lookup,
            searchRecord: searchRecord,
            createRecord: createRecord,
            submitRecord: submitRecord,
            loadsearch: loadsearch,
            responseYuhu: responseYuhu,
            postWebhook: postWebhook,
            bookWebhook: bookWebhook,
            updateYuhu: updateYuhu,
            formatDate: formatDate,
            updateSalesOrder: updateSalesOrder,
            searchidentificador: searchidentificador
        }
    });