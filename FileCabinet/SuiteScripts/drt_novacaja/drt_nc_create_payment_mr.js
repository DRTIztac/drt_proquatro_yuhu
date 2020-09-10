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

                        log.audit({
                            title: 'parametro.recordType',
                            details: JSON.stringify(parametro)
                        });
                        var parametro = JSON.parse(data.values.custrecord_drt_nc_p_context);
                        var mensajeFinal = [];
                        switch (parametro.recordType) {
                            case 'customerpayment':
                                var existPaymen = {
                                    success: false
                                };
                                if (parametro.custbody_drt_nc_identificador_pago) {
                                    existPaymen = drt_cn_lib.searchidentificador(record.Type.CUSTOMER_PAYMENT, 'custbody_drt_nc_identificador_pago', parametro.custbody_drt_nc_identificador_pago) || {
                                        success: false
                                    };
                                }
                                if (!existPaymen.success) {
                                    var customerpayment = procesarCustomerPayment(parametro, data.values.custrecord_drt_nc_p_conexion.value);
                                    if (customerpayment.success) {
                                        if (customerpayment.data.transaccion) {
                                            objupdate.custrecord_drt_nc_p_transaccion = customerpayment.data.transaccion;
                                            mensajeFinal.push('Se genero ' + customerpayment.data.type_1 + ' con id: ' + objupdate.custrecord_drt_nc_p_transaccion);
                                        }
                                        // if (customerpayment.data.check) {
                                        //     objupdate.custrecord_drt_nc_p_transaccion_2 = customerpayment.data.check;
                                        //     mensajeFinal.push('Se genero cheque con id: ' + customerpayment.data.check);
                                        // }
                                        if (objupdate.custrecord_drt_nc_p_transaccion /*&& objupdate.custrecord_drt_nc_p_transaccion_2 */ ) {
                                            objupdate.custrecord_drt_nc_p_terminado = true;
                                        }
                                    }
                                    if (customerpayment.error && customerpayment.error.length > 0) {
                                        objupdate.custrecord_drt_nc_p_error = JSON.stringify(customerpayment.error);
                                        mensajeFinal.push('Error: ' + objupdate.custrecord_drt_nc_p_error);
                                    }
                                } else {
                                    objupdate.custrecord_drt_nc_p_error = 'Error existe  unn pago con custbody_drt_nc_identificador_pago: ' + parametro.custbody_drt_nc_identificador_pago + ' ' + existPaymen.data;
                                }
                                break;
                            case 'cashsale':
                                var existTransaction = {
                                    success: false
                                };
                                if (parametro.custbody_drt_nc_identificador_pago) {
                                    existTransaction = drt_cn_lib.searchidentificador(record.Type.CASH_SALE, 'custbody_drt_nc_identificador_pago', parametro.custbody_drt_nc_identificador_pago) || {
                                        success: false
                                    };
                                }
                                if (!existTransaction.success) {
                                    var cashsaleTransaction = procesarCashsale(parametro, parametro.custrecord_drt_nc_p_conexion.value);
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
                                } else {
                                    objupdate.custrecord_drt_nc_p_error = 'Error existe una venta en efectivo con custbody_drt_nc_identificador_pago: ' + parametro.custbody_drt_nc_identificador_pago + ' ' + existTransaction.data;
                                }
                                break;
                            case 'invoice':
                                var existTransaction = {
                                    success: false
                                };
                                if (parametro.custbody_drt_nc_identificador_pago) {
                                    existTransaction = drt_cn_lib.searchidentificador(record.Type.INVOICE, 'custbody_drt_nc_identificador_pago', parametro.custbody_drt_nc_identificador_pago) || {
                                        success: false
                                    };
                                }
                                if (!existTransaction.success) {
                                    var invoiceTransaction = procesarInvoice(parametro, data.values.custrecord_drt_nc_p_conexion.value);
                                    if (invoiceTransaction.success) {
                                        if (invoiceTransaction.data.transaccion) {
                                            objupdate.custrecord_drt_nc_p_transaccion = invoiceTransaction.data.transaccion;
                                            mensajeFinal.push('Se genero la factura de venta con id: ' + objupdate.custrecord_drt_nc_p_transaccion);
                                            objupdate.custrecord_drt_nc_p_terminado = true;
                                        }

                                    }
                                    if (invoiceTransaction.error && invoiceTransaction.error.length > 0) {
                                        objupdate.custrecord_drt_nc_p_error = JSON.stringify(invoiceTransaction.error);
                                        mensajeFinal.push('Error: ' + objupdate.custrecord_drt_nc_p_error);
                                    }
                                } else {
                                    objupdate.custrecord_drt_nc_p_error = 'Error existe una factura de venta con custbody_drt_nc_identificador_pago: ' + parametro.custbody_drt_nc_identificador_pago + ' ' + existTransaction.data;
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
                    // switch (parametro.custbody_drt_nc_tipo_pago) {
                    //     case 1: //Pago Normal


                    //         break;

                    //     default:
                    //         respuesta.error.push('Tipo de pago no valido: ' + parametro.custbody_drt_nc_tipo_pago);
                    //         break;
                    // }
                    var montoPago = parseFloat(parametro.custbody_drt_nc_total_interes) + parseFloat(parametro.custbody_drt_nc_total_iva);
                    if (
                        montoPago > 0
                    ) {
                        respuesta.data.type_1 = 'el pago de cliente';
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
                            custbody_drt_nc_monto_excedente: parametro.custbody_drt_nc_monto_excedente,
                            custbody_drt_nc_monto_faltante: parametro.custbody_drt_nc_monto_faltante,
                            custbody_drt_nc_identificador_pago: parametro.custbody_drt_nc_identificador_pago,
                        }, parametro.internalid, montoPago)
                    } else if (parametro.custbody_drt_nc_total_capital > 0) {
                        // respuesta.error.push('Solo se paga capital');

                        var accountDebit = 819;
                        var loadItem = itemTransaction(record.Type.INVOICE, parametro.internalid, 0);

                        var cuentaItem = drt_cn_lib.lookup(search.Type.ITEM, loadItem.data, ['custitem_drt_accounnt_capital']);
                        if (
                            cuentaItem.success &&
                            cuentaItem.data.custitem_drt_accounnt_capital &&
                            cuentaItem.data.custitem_drt_accounnt_capital[0] &&
                            cuentaItem.data.custitem_drt_accounnt_capital[0].value
                        ) {
                            accountDebit = cuentaItem.data.custitem_drt_accounnt_capital[0].value;
                        }
                        log.audit({
                            title: 'accountDebit',
                            details: JSON.stringify(accountDebit)
                        });
                        var objSublist_journal = {
                            line: [],
                        };
                        var objField_journal = {};

                        if (parametro.custbody_drt_nc_identificador_folio) {
                            objField_journal.custbody_drt_nc_identificador_folio = parametro.custbody_drt_nc_identificador_folio;
                        }
                        if (parametro.custbody_drt_nc_identificador_uuid) {
                            objField_journal.custbody_drt_nc_identificador_uuid = parametro.custbody_drt_nc_identificador_uuid;
                        }
                        if (parametro.custbody_drt_nc_identificador_pago) {
                            objField_journal.custbody_drt_nc_identificador_pago = parametro.custbody_drt_nc_identificador_pago;
                        }
                        objField_journal.custbody_drt_nc_con_je = parseInt(parametro.record);
                        objField_journal.custbody_drt_nc_createdfrom = parametro.internalid;
                        objField_journal.custbody_drt_nc_pendiente_enviar = true;
                        if (parametro.trandate) {
                            objField_journal.trandate = format.parse({
                                value: parametro.trandate,
                                type: format.Type.DATE
                            }) || '';
                        }

                        objSublist_journal.line.push({
                            account: parametro.account,
                            debit: parametro.custbody_drt_nc_total_capital,
                            entity: datosTransaction.data.entity[0].value,
                        });
                        objSublist_journal.line.push({
                            account: accountDebit,
                            credit: parametro.custbody_drt_nc_total_capital,
                        });


                        newtransaction = drt_cn_lib.createRecord(record.Type.JOURNAL_ENTRY, objField_journal, objSublist_journal, {});
                    }
                    if (newtransaction.success) {
                        respuesta.data.transaccion = newtransaction.data;
                        // if (parametro.custbody_drt_nc_monto_excedente) {
                        // var objSublist_transaction = {
                        //     expense: []
                        // };
                        // objSublist_transaction.expense.push({
                        //     account: parametro.account || '',
                        //     amount: parametro.custbody_drt_nc_monto_excedente,
                        //     taxcode: 5,
                        // })

                        // var newtransaction_2 = drt_cn_lib.createRecord(
                        //     record.Type.CHECK, {
                        //         entity: datosTransaction.data.entity[0].value,
                        //         trandate: format.parse({
                        //             value: parametro.trandate,
                        //             type: format.Type.DATE
                        //         }) || '',
                        //         account: 617,
                        //         custbody_drt_nc_tipo_pago: parametro.custbody_drt_nc_tipo_pago || '',
                        //         custbody_drt_nc_total_transaccion: parametro.custbody_drt_nc_monto_excedente || '',
                        //         custbody_drt_nc_identificador_uuid: parametro.custbody_drt_nc_identificador_uuid || '',
                        //         custbody_drt_nc_identificador_folio: parametro.custbody_drt_nc_identificador_folio || '',
                        //         custbody_drt_nc_pendiente_enviar: true,
                        //         custbody_drt_nc_createdfrom: parametro.internalid,
                        //         custbody_drt_nc_con_ch: idConexion,
                        //     },
                        //     objSublist_transaction, {}
                        // );
                        // log.audit({
                        //     title: 'newtransaction_2',
                        //     details: JSON.stringify(newtransaction_2)
                        // });
                        // if (newtransaction_2.success) {
                        //     respuesta.data.check = newtransaction_2.data;
                        // }
                        // }
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
                    if (datosTransaction.data.location && datosTransaction.data.location[0] && datosTransaction.data.location[0].value) {

                    } else {
                        respuesta.error.push('No se tiene Ubicacion ');
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
                                !patametroActualizacionUno[iv].custcol_drt_nc_fecha_vencimiento ||
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

                    var loadItem = itemTransaction(record.Type.SALES_ORDER, parametro.internalid, 0);

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
                        if (loadItem.success) {
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
                                custbody_drt_nc_identificador_pago: parametro.custbody_drt_nc_identificador_pago || '',
                                custbody_drt_nc_identificador_folio: parametro.custbody_drt_nc_identificador_folio || '',
                                custbody_drt_nc_pendiente_enviar: true,
                                custbody_drt_nc_createdfrom: parametro.internalid,
                                custbody_drt_nc_con_cs: idConexion,
                            },
                            objSublist_transaction, {}
                        );

                    } else if (parametro.custbody_drt_nc_total_capital > 0) {
                        // respuesta.error.push('Solo se paga capital');
                        var accountDebit = 819;
                        var cuentaItem = drt_cn_lib.lookup(search.Type.ITEM, loadItem.data, ['custitem_drt_accounnt_capital']);
                        if (
                            cuentaItem.success &&
                            cuentaItem.data.custitem_drt_accounnt_capital &&
                            cuentaItem.data.custitem_drt_accounnt_capital[0] &&
                            cuentaItem.data.custitem_drt_accounnt_capital[0].value
                        ) {
                            accountDebit = cuentaItem.data.custitem_drt_accounnt_capital[0].value;
                        }
                        log.audit({
                            title: 'accountDebit',
                            details: JSON.stringify(accountDebit)
                        });
                        var objSublist_journal = {
                            line: [],
                        };
                        var objField_journal = {};

                        if (parametro.custbody_drt_nc_identificador_folio) {
                            objField_journal.custbody_drt_nc_identificador_folio = parametro.custbody_drt_nc_identificador_folio;
                        }
                        if (parametro.custbody_drt_nc_identificador_uuid) {
                            objField_journal.custbody_drt_nc_identificador_uuid = parametro.custbody_drt_nc_identificador_uuid;
                        }
                        if (parametro.custbody_drt_nc_identificador_pago) {
                            objField_journal.custbody_drt_nc_identificador_pago = parametro.custbody_drt_nc_identificador_pago;
                        }
                        objField_journal.custbody_drt_nc_con_je = parseInt(parametro.record);
                        objField_journal.custbody_drt_nc_createdfrom = parametro.internalid;
                        objField_journal.custbody_drt_nc_pendiente_enviar = true;
                        if (parametro.trandate) {
                            objField_journal.trandate = format.parse({
                                value: parametro.trandate,
                                type: format.Type.DATE
                            }) || '';
                        }

                        objSublist_journal.line.push({
                            account: parametro.account,
                            debit: parametro.custbody_drt_nc_total_capital,
                            entity: datosTransaction.data.entity[0].value,
                        });
                        objSublist_journal.line.push({
                            account: accountDebit,
                            credit: parametro.custbody_drt_nc_total_capital,
                        });


                        newtransaction = drt_cn_lib.createRecord(record.Type.JOURNAL_ENTRY, objField_journal, objSublist_journal, {});

                    }

                    if (newtransaction.success) {
                        respuesta.data.transaccion = newtransaction.data;
                        var actualizacion = drt_cn_lib.updateSalesOrder(parametro.internalid, patametroActualizacionUno, patametroActualizacionDos, newtransaction.data);
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

        function procesarInvoice(parametro) {
            try {
                var respuesta = {
                    success: false,
                    data: {},
                    error: []
                };
                var newtransaction = {};

                var errorDatosFaltantes = validateData(
                    parametro, [
                        "record",
                        "internalid",
                        "custbody_drt_nc_total_capital",
                        "custbody_drt_nc_total_interes",
                        "custbody_drt_nc_total_iva",
                        "total",
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
                    if (datosTransaction.data.entity && datosTransaction.data.entity[0] && datosTransaction.data.entity[0].value) {} else {
                        respuesta.error.push('No se tiene cliente ');
                    }
                    if (datosTransaction.data.location && datosTransaction.data.location[0] && datosTransaction.data.location[0].value) {

                    } else {
                        respuesta.error.push('No se tiene Ubicacion ');
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
                        var itemDefecto = 17;
                        if (parametro.custbody_drt_nc_tipo_credito) {
                            itemDefecto = parametro.custbody_drt_nc_tipo_credito;
                        } else {
                            var loadItem = itemTransaction(record.Type.SALES_ORDER, parametro.internalid, 0);
                            if (loadItem.success) {
                                itemDefecto = loadItem.data;
                            }
                        }

                        for (var fi in parametro.item) {
                            objSublist_transaction.item.push({
                                item: itemDefecto,
                                price: "-1",
                                quantity: 1,
                                rate: 0,
                                custcol_drt_nc_fecha: format.parse({
                                    value: parametro.item[fi].trandate,
                                    type: format.Type.DATE
                                }),
                                custcol_drt_nc_fecha_vencimiento: format.parse({
                                    value: parametro.item[fi].custcol_drt_nc_fecha_vencimiento,
                                    type: format.Type.DATE
                                }),
                                custcol_drt_nc_facturado: true,
                                custcol_drt_nc_monto_capital: parametro.item[fi].custbody_drt_nc_total_capital,
                                custcol_drt_nc_monto_interes: parametro.item[fi].custbody_drt_nc_total_interes,
                                custcol_drt_nc_monto_iva: parametro.item[fi].custbody_drt_nc_total_iva,
                                custcol_drt_nc_monto_total: parametro.item[fi].custbody_drt_nc_total_transaccion,
                                custcol_drt_nc_num_amortizacion: parametro.item[fi].num_amortizacion,
                            });

                        }
                        objSublist_transaction.item[0].rate = parametro.custbody_drt_nc_total_interes || 0;
                        newtransaction = drt_cn_lib.createRecord(
                            record.Type.INVOICE, {
                                entity: datosTransaction.data.entity[0].value,
                                location: datosTransaction.data.location[0].value,
                                trandate: format.parse({
                                    value: parametro.trandate,
                                    type: format.Type.DATE
                                }) || '',
                                class: parametro.class || '',
                                custbody_drt_nc_tipo_pago: parametro.custbody_drt_nc_tipo_pago || '',
                                custbody_drt_nc_total_capital: parametro.custbody_drt_nc_total_capital || '',
                                custbody_drt_nc_total_interes: parametro.custbody_drt_nc_total_interes || '',
                                custbody_drt_nc_tipo_credito: parametro.custbody_drt_nc_tipo_credito || '',
                                custbody_drt_nc_total_iva: parametro.custbody_drt_nc_total_iva || '',
                                custbody_drt_nc_total_transaccion: parametro.custbody_drt_nc_total_transaccion || '',
                                custbody_drt_nc_identificador_uuid: parametro.custbody_drt_nc_identificador_uuid || '',
                                custbody_drt_nc_tipo_pago: parametro.custbody_drt_nc_tipo_pago || '',
                                custbody_drt_nc_identificador_pago: parametro.custbody_drt_nc_identificador_pago || '',
                                custbody_drt_nc_tipo_descuento: parametro.custbody_drt_nc_tipo_descuento || '',
                                custbody_drt_nc_identificador_folio: parametro.custbody_drt_nc_identificador_folio || '',
                                custbody_drt_nc_num_amortizacion: parametro.custbody_drt_nc_num_amortizacion || '',
                                custbody_drt_nc_pendiente_enviar: true,
                                custbody_drt_nc_createdfrom: parametro.internalid,
                                custbody_drt_nc_con_in: parametro.record,
                            },
                            objSublist_transaction, {}
                        );

                    } else if (parametro.custbody_drt_nc_total_capital > 0) {
                        // respuesta.error.push('Solo se paga capital');
                        var accountDebit = 819;
                        var cuentaItem = drt_cn_lib.lookup(search.Type.ITEM, loadItem.data, ['custitem_drt_accounnt_capital']);
                        if (
                            cuentaItem.success &&
                            cuentaItem.data.custitem_drt_accounnt_capital &&
                            cuentaItem.data.custitem_drt_accounnt_capital[0] &&
                            cuentaItem.data.custitem_drt_accounnt_capital[0].value
                        ) {
                            accountDebit = cuentaItem.data.custitem_drt_accounnt_capital[0].value;
                        }
                        log.audit({
                            title: 'accountDebit',
                            details: JSON.stringify(accountDebit)
                        });
                        var objSublist_journal = {
                            line: [],
                        };
                        var objField_journal = {};

                        if (parametro.total) {
                            objField_journal.custbody_drt_nc_total_transaccion = parametro.total;
                        }
                        if (parametro.custbody_drt_nc_total_capital) {
                            objField_journal.custbody_drt_nc_total_capital = parametro.custbody_drt_nc_total_capital;
                        }
                        if (parametro.custbody_drt_nc_total_interes) {
                            objField_journal.custbody_drt_nc_total_interes = parametro.custbody_drt_nc_total_interes;
                        }
                        if (parametro.custbody_drt_nc_total_iva) {
                            objField_journal.custbody_drt_nc_total_iva = parametro.custbody_drt_nc_total_iva;
                        }
                        if (parametro.custbody_drt_nc_identificador_folio) {
                            objField_journal.custbody_drt_nc_identificador_folio = parametro.custbody_drt_nc_identificador_folio;
                        }
                        if (parametro.custbody_drt_nc_identificador_uuid) {
                            objField_journal.custbody_drt_nc_identificador_uuid = parametro.custbody_drt_nc_identificador_uuid;
                        }
                        if (parametro.custbody_drt_nc_identificador_pago) {
                            objField_journal.custbody_drt_nc_identificador_pago = parametro.custbody_drt_nc_identificador_pago;
                        }
                        objField_journal.custbody_drt_nc_con_je = parseInt(parametro.record);
                        objField_journal.custbody_drt_nc_createdfrom = parametro.internalid;
                        objField_journal.custbody_drt_nc_pendiente_enviar = true;
                        if (parametro.trandate) {
                            objField_journal.trandate = format.parse({
                                value: parametro.trandate,
                                type: format.Type.DATE
                            }) || '';
                        }

                        objSublist_journal.line.push({
                            account: accountDebit,
                            debit: parametro.custbody_drt_nc_total_capital,
                            entity: datosTransaction.data.entity[0].value,
                        });
                        objSublist_journal.line.push({
                            account: accountDebit,
                            credit: parametro.custbody_drt_nc_total_capital,
                        });


                        newtransaction = drt_cn_lib.createRecord(record.Type.JOURNAL_ENTRY, objField_journal, objSublist_journal, {});

                    }
                    if (newtransaction.success) {
                        respuesta.data.transaccion = newtransaction.data;
                    }
                }

                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.error({
                    title: 'error procesarInvoice',
                    details: JSON.stringify(error)
                });
                respuesta.error.push(error);
            } finally {
                log.emergency({
                    title: 'respuesta procesarInvoice',
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

        function createPayment(newRecord, param_field_value, param_internalid, param_amount) {
            try {
                var respuesta = {
                    success: false,
                    data: {}
                };
                log.audit({
                    title: 'param_amount',
                    details: JSON.stringify(param_amount)
                });
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