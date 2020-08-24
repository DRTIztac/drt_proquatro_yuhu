/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './drt_cn_lib', 'N/runtime', 'N/format'],
    function (search, record, drt_cn_lib, runtime, format) {

        function getInputData() {
            try {

                var respuesta = search.create({
                    type: 'customrecord_drt_nc_pagos',
                    columns: [
                        'custrecord_drt_nc_p_context',
                        'custrecord_drt_nc_p_conexion',
                        'custrecord_drt_nc_p_http',
                        'custrecord_drt_nc_p_procesado',
                        'custrecord_drt_nc_p_terminado',
                        'custrecord_drt_nc_p_respuesta',
                        'custrecord_drt_nc_p_resultado',
                        'custrecord_drt_nc_p_error',
                        'custrecord_drt_nc_p_transaccion',
                        'custrecord_drt_nc_p_file_json',
                        'custrecord_drt_nc_p_notificacion_error'
                    ],
                    filters: [
                        ['isinactive', search.Operator.IS, 'F'],
                        'and',
                        ['custrecord_drt_nc_p_procesado', search.Operator.IS, 'F'],
                        'and',
                        ['custrecord_drt_nc_p_terminado', search.Operator.IS, 'F'],
                        'and',
                        ['custrecord_drt_nc_p_context', search.Operator.ISNOTEMPTY, null],
                        'and',
                        ['custrecord_drt_nc_p_transaccion', search.Operator.ANYOF, '@NONE@']

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

                record.submitFields({
                    type: objvalue.recordType,
                    id: objvalue.id,
                    values: {
                        custrecord_drt_nc_p_procesado: true
                    },
                    options: {
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    }
                });


            } catch (error) {
                log.error({
                    title: 'error map',
                    details: JSON.stringify(error)
                });

            } finally {
                context.write({
                    key: objvalue.id,
                    value: objvalue
                });
            }

        }

        function reduce(context) {
            try {
                var recordData = context.values;
                for (var ids in recordData) {
                    try {
                        var objupdate = {
                            custrecord_drt_nc_p_procesado: false,
                            custrecord_drt_nc_p_error: ''
                        };
                        var data = JSON.parse(recordData[ids]);
                        log.emergency({
                            title: 'data',
                            details: JSON.stringify(data)
                        });

                        var parametro = JSON.parse(data.values.custrecord_drt_nc_p_context);
                        var mensajeFinal = [];
                        switch (parametro.recordType) {
                            case 'customerpayment':
                                var customerpayment = procesarCustomerPayment(parametro, data.values.custrecord_drt_nc_p_conexion.value);
                                if (customerpayment.success) {
                                    if (customerpayment.data.transaccion) {
                                        objupdate.custrecord_drt_nc_p_transaccion = customerpayment.data.transaccion;
                                        mensajeFinal.push('Se genero el pago de cliente con id: ' + objupdate.custrecord_drt_nc_p_transaccion);
                                    }
                                    if (customerpayment.data.journal) {
                                        objupdate.custrecord_drt_nc_p_transaccion_2 = customerpayment.data.journal;
                                        mensajeFinal.push('Se genero entrada de diario con id: ' + customerpayment.data.journal);
                                    }
                                    if (objupdate.custrecord_drt_nc_p_transaccion && objupdate.custrecord_drt_nc_p_transaccion_2) {
                                        objupdate.custrecord_drt_nc_p_terminado = true;
                                    }
                                }
                                if (customerpayment.error && customerpayment.error.length > 0) {
                                    objupdate.custrecord_drt_nc_p_error = JSON.stringify(customerpayment.error);
                                    mensajeFinal.push('Error: ' + objupdate.custrecord_drt_nc_p_error);
                                }

                                break;
                            case 'cashsale':
                                var cashsaleTransaction = procesarCashsale(parametro, data.values.custrecord_drt_nc_p_conexion.value);
                                if (cashsaleTransaction.success) {
                                    if (cashsaleTransaction.data.transaccion) {
                                        objupdate.custrecord_drt_nc_p_transaccion = cashsaleTransaction.data.transaccion;
                                        mensajeFinal.push('Se genero la venta en efectivo con id: ' + objupdate.custrecord_drt_nc_p_transaccion);
                                    }
                                    if (cashsaleTransaction.data.actualizacion) {
                                        objupdate.custrecord_drt_nc_p_transaccion_2 = cashsaleTransaction.data.actualizacion;
                                        mensajeFinal.push('Se actualizo la orden de venta: ' + cashsaleTransaction.data.actualizacion);
                                    }
                                    if (objupdate.custrecord_drt_nc_p_transaccion && objupdate.custrecord_drt_nc_p_transaccion_2) {
                                        objupdate.custrecord_drt_nc_p_terminado = true;
                                    }

                                }
                                if (cashsaleTransaction.error && cashsaleTransaction.error.length > 0) {
                                    objupdate.custrecord_drt_nc_p_error = JSON.stringify(cashsaleTransaction.error);
                                    mensajeFinal.push('Error: ' + objupdate.custrecord_drt_nc_p_error);
                                }

                                break;
                            default:
                                mensajeFinal.push('Opción no valida: ' + parametro.recordtype);
                                break;
                        }
                        objupdate.custrecord_drt_nc_p_resultado = mensajeFinal.join();



                    } catch (error) {
                        log.error({
                            title: 'error reduce',
                            details: JSON.stringify(error)
                        });
                        objupdate.custrecord_drt_nc_p_error = JSON.stringify(error);
                    } finally {
                        log.audit({
                            title: 'objupdate ' + data.id,
                            details: JSON.stringify(objupdate)
                        });
                        var idUpdate = record.submitFields({
                            type: data.recordType,
                            id: data.id,
                            values: objupdate,
                            options: {
                                enableSourcing: true,
                                ignoreMandatoryFields: true
                            }
                        });
                        log.audit({
                            title: 'idUpdate',
                            details: JSON.stringify(idUpdate)
                        });
                    }
                }
            } catch (error) {
                log.error({
                    title: 'error reduce',
                    details: JSON.stringify(error)
                });
                objupdate.custrecord_drt_nc_p_error = JSON.stringify(error);
            }
        }

        function procesarCustomerPayment(parametro, idConexion) {
            try {
                var respuesta = {
                    success: false,
                    data: {},
                    error: []
                };

                var errorDatosFaltantes = validateData(
                    parametro, [
                        "record",
                        "internalid",
                        "custbody_drt_nc_total_capital",
                        "custbody_drt_nc_total_interes",
                        "custbody_drt_nc_total_iva",
                        "total",
                        "account",
                        "recordType",
                        "custbody_drt_nc_tipo_pago",
                        "custbody_drt_nc_identificador_uuid",
                        "custbody_drt_nc_identificador_folio",
                        "trandate",
                    ]);
                if (errorDatosFaltantes.success) {
                    respuesta.error.concat(errorDatosFaltantes.data);
                }
                var datosTransaction = drt_cn_lib.lookup(record.Type.INVOICE, parametro.internalid, ['entity']);
                if (datosTransaction.success) {
                    if (datosTransaction.data.entity && datosTransaction.data.entity[0] && datosTransaction.data.entity[0].value) {


                    } else {
                        respuesta.error.push('No se tiene cliente ');
                    }
                } else {
                    respuesta.error.push('No se tiene datos de transaccion');
                }
                if (respuesta.error.length > 0) {
                    respuesta.error.push('No se pueden generar la transacción.');
                } else {
                    parametro.custbody_drt_nc_tipo_pago = parseFloat(parametro.custbody_drt_nc_tipo_pago);
                    parametro.custbody_drt_nc_total_capital = parseFloat(parametro.custbody_drt_nc_total_capital);
                    parametro.custbody_drt_nc_total_interes = parseFloat(parametro.custbody_drt_nc_total_interes);
                    parametro.custbody_drt_nc_total_iva = parseFloat(parametro.custbody_drt_nc_total_iva);
                    if (parametro.faltante) {
                        parametro.custbody_drt_nc_monto_faltante = parseFloat(parametro.faltante);
                    }
                    if (parametro.excedente) {
                        parametro.custbody_drt_nc_monto_excedente = parseFloat(parametro.excedente);
                    }

                    if (parametro.custbody_drt_nc_total_transaccion) {
                        parametro.custbody_drt_nc_total_transaccion = parseFloat(parametro.custbody_drt_nc_total_transaccion);
                    } else {
                        parametro.custbody_drt_nc_total_transaccion = parseFloat(parametro.total);
                    }
                    var newtransaction = {}
                    switch (parametro.custbody_drt_nc_tipo_pago) {
                        case 1: //Pago Normal

                            if (
                                parametro.custbody_drt_nc_total_interes > 0 &&
                                parametro.custbody_drt_nc_total_iva > 0
                            ) {
                                newtransaction = createPayment(record.transform({
                                    fromType: record.Type.INVOICE,
                                    fromId: parametro.internalid,
                                    toType: record.Type.CUSTOMER_PAYMENT,
                                    isDynamic: true,
                                    defaultValues: {},
                                }), {
                                    trandate: format.parse({
                                        value: parametro.trandate,
                                        type: format.Type.DATE
                                    }) || '',
                                    account: parametro.account || '',
                                    custbody_drt_nc_pendiente_enviar: true,
                                    custbody_drt_nc_con_cp: idConexion || '',
                                    custbody_drt_nc_tipo_pago: parametro.custbody_drt_nc_tipo_pago || '',
                                    custbody_drt_nc_total_capital: parametro.custbody_drt_nc_total_capital || '',
                                    custbody_drt_nc_total_interes: parametro.custbody_drt_nc_total_interes || '',
                                    custbody_drt_nc_total_iva: parametro.custbody_drt_nc_total_iva || '',
                                    custbody_drt_nc_total_transaccion: parametro.custbody_drt_nc_total_transaccion || '',
                                    custbody_drt_nc_identificador_uuid: parametro.custbody_drt_nc_identificador_uuid || '',
                                    custbody_drt_nc_identificador_folio: parametro.custbody_drt_nc_identificador_folio || '',
                                    custbody_drt_nc_createdfrom: parametro.internalid,
                                }, parametro.internalid, parseFloat(parametro.custbody_drt_nc_total_interes) + parseFloat(parametro.custbody_drt_nc_total_iva))
                            } else if (parametro.custbody_drt_nc_total_capital > 0) {
                                respuesta.error.push('Solo se paga capital');
                            }
                            break;

                        default:
                            respuesta.error.push('Tipo de pago no valido: ' + parametro.custbody_drt_nc_tipo_pago);
                            break;
                    }
                    if (newtransaction.success) {
                        respuesta.data.transaccion = newtransaction.data;
                    }
                }

                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.error({
                    title: 'error procesarCustomerPayment',
                    details: JSON.stringify(error)
                });
                respuesta.error = error;
            } finally {
                log.emergency({
                    title: 'respuesta procesarCustomerPayment',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function procesarCashsale(parametro, idConexion) {
            try {
                var respuesta = {
                    success: false,
                    data: {},
                    error: []
                };
                var newtransaction = {}
                var patametroActualizacionUno = {};
                var patametroActualizacionDos = false;
                parametro.custbody_drt_nc_tipo_pago = parseFloat(parametro.custbody_drt_nc_tipo_pago);

                var errorDatosFaltantes = validateData(
                    parametro, [
                        "record",
                        "internalid",
                        "custbody_drt_nc_total_capital",
                        "custbody_drt_nc_total_interes",
                        "custbody_drt_nc_total_iva",
                        "total",
                        "account",
                        "recordType",
                        "custbody_drt_nc_tipo_pago",
                        "custbody_drt_nc_identificador_uuid",
                        "custbody_drt_nc_identificador_folio",
                        "trandate",
                    ]);
                if (errorDatosFaltantes.success) {
                    respuesta.error.concat(errorDatosFaltantes.data);
                }
                var datosTransaction = drt_cn_lib.lookup(record.Type.SALES_ORDER, parametro.internalid, ['entity', 'location']) || '';
                if (datosTransaction.success) {
                    if (datosTransaction.data.entity && datosTransaction.data.entity[0] && datosTransaction.data.entity[0].value) {


                    } else {
                        respuesta.error.push('No se tiene cliente ');
                    }
                } else {
                    respuesta.error.push('No se tiene datos de transaccion');
                }
                switch (parametro.custbody_drt_nc_tipo_pago) {
                    case 3: //Capital Parcial
                        patametroActualizacionUno = parametro.item;
                        for (var iv = 0; iv < patametroActualizacionUno.length; iv++) {
                            if (!patametroActualizacionUno[iv].interes ||
                                !patametroActualizacionUno[iv].fecha ||
                                !patametroActualizacionUno[iv].total ||
                                !patametroActualizacionUno[iv].num_amortizacion ||
                                !patametroActualizacionUno[iv].capital ||
                                !patametroActualizacionUno[iv].iva
                            ) {
                                respuesta.error.push('Falta informacion en la linea de amortizacion: ' + JSON.stringify(patametroActualizacionUno[iv]));

                            }
                        }
                        break;
                    case 4: //Capital Total
                        patametroActualizacionDos = true;
                        break;

                    default:
                        respuesta.error.push('Tipo de pago no valido: ' + parametro.custbody_drt_nc_tipo_pago);
                        break;
                }
                if (respuesta.error.length > 0) {
                    respuesta.error.push('No se pueden generar la transacción.');
                } else {
                    parametro.custbody_drt_nc_total_capital = parseFloat(parametro.custbody_drt_nc_total_capital);
                    parametro.custbody_drt_nc_total_interes = parseFloat(parametro.custbody_drt_nc_total_interes);
                    parametro.custbody_drt_nc_total_iva = parseFloat(parametro.custbody_drt_nc_total_iva);
                    if (parametro.custbody_drt_nc_total_transaccion) {
                        parametro.custbody_drt_nc_total_transaccion = parseFloat(parametro.custbody_drt_nc_total_transaccion);
                    } else {
                        parametro.custbody_drt_nc_total_transaccion = parseFloat(parametro.total);
                    }


                    if (
                        parametro.custbody_drt_nc_total_interes > 0
                    ) {
                        var objSublist_transaction = {
                            item: [],
                        };
                        objSublist_transaction.item.push({
                            item: 0,
                            price: "-1",
                            quantity: 1,
                            rate: 0,
                            custcol_drt_nc_fecha: format.parse({
                                value: parametro.trandate,
                                type: format.Type.DATE
                            }),
                            custcol_drt_nc_facturado: true,
                            custcol_drt_nc_monto_capital: parametro.custbody_drt_nc_total_capital,
                            custcol_drt_nc_monto_interes: parametro.custbody_drt_nc_total_interes,
                            custcol_drt_nc_monto_iva: parametro.custbody_drt_nc_total_iva,
                            custcol_drt_nc_monto_total: parametro.custbody_drt_nc_total_transaccion,
                        });
                        objSublist_transaction.item[0].item = 17;
                        var loadItem = itemTransaction(record.Type.SALES_ORDER, parametro.internalid, 0);
                        if (loadItem) {
                            objSublist_transaction.item[0].item = loadItem.data;
                        }

                        objSublist_transaction.item[0].rate = parametro.custbody_drt_nc_total_interes || 0;
                        newtransaction = drt_cn_lib.createRecord(
                            record.Type.CASH_SALE, {
                                entity: datosTransaction.data.entity[0].value,
                                location: datosTransaction.data.location[0].value,
                                trandate: format.parse({
                                    value: parametro.trandate,
                                    type: format.Type.DATE
                                }) || '',
                                account: parametro.account || '',
                                custbody_drt_nc_tipo_pago: parametro.custbody_drt_nc_tipo_pago || '',
                                custbody_drt_nc_total_capital: parametro.custbody_drt_nc_total_capital || '',
                                custbody_drt_nc_total_interes: parametro.custbody_drt_nc_total_interes || '',
                                custbody_drt_nc_total_iva: parametro.custbody_drt_nc_total_iva || '',
                                custbody_drt_nc_total_transaccion: parametro.custbody_drt_nc_total_transaccion || '',
                                custbody_drt_nc_identificador_uuid: parametro.custbody_drt_nc_identificador_uuid || '',
                                custbody_drt_nc_identificador_folio: parametro.custbody_drt_nc_identificador_folio || '',
                                custbody_drt_nc_pendiente_enviar: true,
                                custbody_drt_nc_createdfrom: parametro.internalid,
                                custbody_drt_nc_con_cs: idConexion,
                            },
                            objSublist_transaction, {}
                        );

                    } else if (parametro.custbody_drt_nc_total_capital > 0) {
                        respuesta.error.push('Solo se paga capital');
                    }


                    if (newtransaction.success) {
                        respuesta.data.transaccion = newtransaction.data;
                        var actualizacion = updateSalesOrder(parametro.internalid, patametroActualizacionUno, patametroActualizacionDos, newtransaction.data);
                        if (actualizacion.success) {
                            respuesta.data.actualizacion = actualizacion.data;
                        } else {
                            respuesta.error.push('No se pudo Actualizar la orden de Venta ');
                        }
                    } else {
                        respuesta.error.push('No se pudo generar pago de contado ');

                    }

                }

                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.error({
                    title: 'error procesarCashsale',
                    details: JSON.stringify(error)
                });
                respuesta.error = error;
            } finally {
                log.emergency({
                    title: 'respuesta procesarCashsale',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function itemTransaction(paramm_type, param_id, param_line) {
            try {
                var respuesta = {
                    success: false,
                    data: ''
                };

                var newRecord = record.load({
                    type: paramm_type,
                    id: param_id,
                    isDynamic: true
                });
                var sublist = 'item';
                var numLines = newRecord.getLineCount({
                    sublistId: sublist
                }) || 0;


                if (param_line < numLines) {
                    respuesta.data = newRecord.getSublistValue({
                        sublistId: sublist,
                        fieldId: 'item',
                        line: param_line
                    }) || '';
                }
                respuesta.success = respuesta.data != '';
            } catch (error) {
                log.error({
                    title: 'error itemTransaction',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta itemTransaction',
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
                var newRecord = record.load({
                    type: record.Type.SALES_ORDER,
                    id: param_id,
                    isDynamic: true
                });
                var memo = 'Actualizacin de amortizacion: ';
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
                    var facturado = newRecord.getCurrentSublistValue({
                        sublistId: sublist,
                        fieldId: 'custcol_drt_nc_facturado',
                    }) || '';

                    if (num_amortizacion && !facturado) {
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
                            if (rate && rate > 0) {
                                memo +=
                                    ' *rate Antes: ' +
                                    newRecord.getCurrentSublistValue({
                                        sublistId: sublist,
                                        fieldId: 'rate',
                                    }) +
                                    ' despues: ' + 0;
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

        function createPayment(newRecord, param_field_value, param_internalid, param_amount) {
            try {
                var respuesta = {
                    success: false,
                    data: {}
                };

                for (var field in param_field_value) {
                    if (param_field_value[field]) {
                        newRecord.setValue({
                            fieldId: field,
                            value: param_field_value[field]
                        });
                    }
                }
                var sublist = 'apply';
                var numLines = newRecord.getLineCount({
                    sublistId: sublist
                }) || 0;

                for (var line = 0; line < numLines; line++) {
                    newRecord.selectLine({
                        sublistId: sublist,
                        line: line
                    });
                    if (
                        newRecord.getCurrentSublistValue({
                            sublistId: sublist,
                            fieldId: 'internalid',
                        }) ==
                        param_internalid
                    ) {
                        newRecord.setCurrentSublistValue({
                            sublistId: sublist,
                            fieldId: 'apply',
                            value: true
                        });

                        newRecord.setCurrentSublistValue({
                            sublistId: sublist,
                            fieldId: 'amount',
                            value: param_amount
                        });
                    } else {
                        newRecord.setCurrentSublistValue({
                            sublistId: sublist,
                            fieldId: 'apply',
                            value: false
                        });

                    }


                }
                respuesta.data = newRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }) || '';

                respuesta.success = respuesta.data != '';

            } catch (error) {
                log.error({
                    title: 'error createPayment',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta createPayment',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function validateData(param_obj, param_field) {
            try {
                var respuesta = {
                    success: false,
                    data: []
                };
                for (var i = 0; i < param_field; i++) {
                    if (!param_obj[param_field[i]]) {
                        respuesta.data.push('Error Falta el atributo: ' + param_field[i]);
                    }
                }
                respuesta.success = respuesta.data.length > 0;
            } catch (error) {
                log.error({
                    title: 'error validateData',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta ',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
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

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });