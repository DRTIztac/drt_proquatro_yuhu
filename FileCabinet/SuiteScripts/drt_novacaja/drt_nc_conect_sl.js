/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 */
define(
    [
        'N/ui/serverWidget',
        'N/record',
        'N/redirect',
        'N/config',
        'N/transaction',
        './drt_cn_lib'
    ],
    function (
        serverWidget,
        record,
        redirect,
        config,
        transaction,
        drt_cn_lib
    ) {
        function onRequest(context) {
            try {
                if (context.request.method === 'GET') {
                    log.audit({
                        title: 'context GET',
                        details: JSON.stringify(context)
                    });
                    printForm(context);
                } else {
                    log.audit({
                        title: 'context POST',
                        details: JSON.stringify(context)
                    });
                    redirect.toSuitelet({
                        scriptId: 'customscript_drt_nc_conect_sl',
                        deploymentId: 'customdeploy_drt_nc_conect_sl',
                        parameters: context.request.parameters
                    });
                }
            } catch (error) {
                log.audit({
                    title: 'error',
                    details: JSON.stringify(error)
                });
            }
        }

        function printForm(context) {
            try {
                var respuesta = {
                    success: false,
                    data: {}
                };

                var form = serverWidget.createForm({
                    title: 'DRT DevelopTool'
                });

                var custpage_id_so = parseInt(context.request.parameters.custpage_id_so) || '';
                // var actualizacion = updateSalesOrder(custpage_id_so, [], true, '');
                var actualizacion = voidTransaction(transaction.Type.SALES_ORDER, custpage_id_so);

                var objField = [{
                        id: 'custpage_result',
                        type: serverWidget.FieldType.TEXTAREA,
                        label: 'Resultado',
                        seleccion: [],
                        defaultValue: JSON.stringify(actualizacion),
                        add: 'addField',
                        field: [],
                    },

                ];
                objField.push({
                    id: 'custpage_id_so',
                    type: serverWidget.FieldType.INTEGER,
                    label: 'ID Sales Order',
                    seleccion: [],
                    defaultValue: custpage_id_so,
                    add: 'addField',
                    field: [],
                });

                for (var field in objField) {
                    var field_add = form[objField[field].add]({
                        id: objField[field].id,
                        type: objField[field].type,
                        label: objField[field].label
                    });
                    for (var value = 0; value < objField[field].seleccion.length; value++) {
                        field_add.addSelectOption(objField[field].seleccion[value]);
                    }
                    if (objField[field].defaultValue) {
                        field_add.defaultValue = objField[field].defaultValue;
                    }
                    for (var campo in objField[field].field) {
                        field_add.addField({
                            id: objField[field].field[campo].id,
                            type: objField[field].field[campo].type,
                            label: objField[field].field[campo].label,
                        });
                    }
                }


                form.addSubmitButton({
                    label: 'Procesar'
                });
                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.error({
                    title: 'error',
                    details: JSON.stringify(error)
                });
                var form = serverWidget.createForm({
                    title: 'DRT NC - ERROR'
                });
                var field_add = form.addField({
                    id: 'custpage_error',
                    type: serverWidget.FieldType.TEXTAREA,
                    label: 'ERROR'
                });

                field_add.defaultValue = JSON.stringify(error);
            } finally {

                log.emergency({
                    title: 'respuesta printForm',
                    details: JSON.stringify(respuesta)
                });
                context.response.writePage(form);
                return respuesta;
            }
        }

        function voidTransaction(param_transaction, param_id) {
            try {
                var respuesta = {
                    success: false,
                    data: ''
                };
                log.audit({
                    title: 'voidTransaction',
                    details: ' param_transaction: ' + param_transaction +
                        ' param_id: ' + param_id
                });
                var configRecObj = config.load({
                    type: config.Type.ACCOUNTING_PREFERENCES
                });
                var revVoid = configRecObj.getValue('REVERSALVOIDING');
                if (revVoid) {
                    configRecObj.setValue({
                        fieldId: 'REVERSALVOIDING',
                        value: false
                    });
                    configRecObj.save();
                }
                if (param_transaction && param_id) {
                    respuesta.data = transaction.void({
                        type: param_transaction, //transaction.Type.SALES_ORDER,
                        id: parseInt(param_id) //salesOrderId
                    });
                }
                var configRecObj = config.load({
                    type: config.Type.ACCOUNTING_PREFERENCES
                });
                var revVoid = configRecObj.getValue('REVERSALVOIDING');
                if (revVoid) {
                    configRecObj.setValue({
                        fieldId: 'REVERSALVOIDING',
                        value: false
                    });
                    configRecObj.save();
                }
                respuesta.success = respuesta.data != '';
            } catch (error) {
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
                        if (parseInt(quantitybilled) == 0) {
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
                                        break;
                                    }
                                }
                            } else if (param_total) {
                                if (rate && parseFloat(rate) > 0) {
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
                                        fieldId: 'isclosed',
                                        value: true
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


        return {
            onRequest: onRequest
        }
    }
);