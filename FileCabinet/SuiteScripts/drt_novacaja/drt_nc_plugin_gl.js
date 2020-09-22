function customizeGlImpact(transactionRecord, standardLines, customLines, book) {

    try {

        var typeRecord = {
            vendbill: 'vendorbill',
            vendpymt: 'vendorpayment',
            vendcred: 'vendorcredit',
            cashsale: 'cashsale',
            custinvc: 'invoice',
            custpymt: 'customerpayment',
            custcred: 'creditmemo',
            custrfnd: 'customerrefund',
            check: 'check'
        };
        var listTypeRecord = {
            vendbill: 17,
            vendpymt: 18,
            vendcred: 20,
            cashsale: 5,
            custinvc: 7,
            custpymt: 9,
            custcred: 10,
            custrfnd: 30,
            check: 3
        };

        var objField = {};
        objField.trandate = transactionRecord.getFieldValue('trandate') || '';
        objField.custbody_drt_nc_identificador_folio = transactionRecord.getFieldValue('custbody_drt_nc_identificador_folio') || '';
        objField.custbody_drt_nc_identificador_uuid = transactionRecord.getFieldValue('custbody_drt_nc_identificador_uuid') || '';
        objField.custbody_drt_nc_pendiente_enviar = transactionRecord.getFieldValue('custbody_drt_nc_pendiente_enviar') || '';
        objField.custbody_drt_nc_tipo_descuento = transactionRecord.getFieldValue('custbody_drt_nc_tipo_descuento') || '';
        objField.custbody_drt_nc_total_capital = transactionRecord.getFieldValue('custbody_drt_nc_total_capital') || '';
        objField.custbody_drt_nc_total_transaccion = transactionRecord.getFieldValue('custbody_drt_nc_total_transaccion') || '';
        objField.custbody_drt_nc_total_interes = transactionRecord.getFieldValue('custbody_drt_nc_total_interes') || '';
        objField.custbody_drt_nc_total_iva = transactionRecord.getFieldValue('custbody_drt_nc_total_iva') || '';
        objField.custbody_drt_nc_num_amortizacion = transactionRecord.getFieldValue('custbody_drt_nc_num_amortizacion') || '';

        var id = transactionRecord.getFieldValue('id');
        var type = transactionRecord.getFieldValue('type');
        var line = 0;
        var objSublist = {
            line: {}
        };

        var record_entity = '';
        var identificador_uuid = transactionRecord.getFieldValue('custbody_drt_nc_identificador_uuid') || '';
        var identificador_folio = transactionRecord.getFieldValue('custbody_drt_nc_identificador_folio') || '';
        var total_capital = transactionRecord.getFieldValue('custbody_drt_nc_total_capital') || '';
        var total_transaccion = transactionRecord.getFieldValue('custbody_drt_nc_total_transaccion') || '';
        var total_interes = transactionRecord.getFieldValue('custbody_drt_nc_total_interes') || '';
        var total_iva = transactionRecord.getFieldValue('custbody_drt_nc_total_iva') || '';
        var transaccion_ajuste = transactionRecord.getFieldValue('custbody_drt_nc_transaccion_ajuste') || '';
        var nc_num_amortizacion = transactionRecord.getFieldValue('custbody_drt_nc_num_amortizacion') || '';
        nlapiLogExecution('AUDIT', 'id', id);
        nlapiLogExecution('AUDIT', 'type', type);
        var total = '';
        var debit = '';
        var credit = '';
        var memo = 'DRT NC - Reclasificación de Capital';
        var tipo_descuento = transactionRecord.getFieldValue('custbody_drt_nc_tipo_descuento') || '';
        var tipo_descuentoText = transactionRecord.getFieldText('custbody_drt_nc_tipo_descuento') || '';
        if (tipo_descuentoText) {
            memo += ', Tipo descuento ' + tipo_descuentoText
        }
        var tipo_pagoText = transactionRecord.getFieldText('custbody_drt_nc_tipo_pago') || '';
        if (tipo_pagoText) {
            memo += ', Tipo pago ' + tipo_pagoText
        }
        var idRecord = {};
        var entity_empresa = '';
        if (identificador_uuid && identificador_folio && !transaccion_ajuste) {
            var transaccionRepetida = searchTransaccion(identificador_folio, nc_num_amortizacion);
            if (!transaccionRepetida.success) {
                switch (type) {
                    case 'custinvc':
                        // var LineItemCount = transactionRecord.getLineItemCount('item') || '';
                        // if (LineItemCount) {
                        //     total = total_capital;
                        //     credit =
                        //         // 317;
                        //         transactionRecord.getFieldValue('account') || '';
                        //     var record_id = transactionRecord.getLineItemValue('item', 'item', 1) || '';
                        //     var fields = ['custitem_drt_accounnt_capital']
                        //     if (record_id) {
                        //         var columns = nlapiLookupField('item', record_id, fields);
                        //         debit =
                        //             // 327;
                        //             columns[fields[0]] || '';
                        //     }
                        // }
                        break;
                    case 'cashsale':
                        record_entity = transactionRecord.getFieldValue('entity') || '';

                        objField.custbody_drt_nc_createdfrom = transactionRecord.getFieldValue('custbody_drt_nc_createdfrom') || '';
                        var LineItemCount = transactionRecord.getLineItemCount('item') || '';
                        if (LineItemCount) {
                            objField.custbody_drt_nc_con_je = transactionRecord.getFieldValue('custbody_drt_nc_con_cs') || '';
                            total = total_capital;
                            var fields = ['custitem_drt_accounnt_capital']
                            var record_id = transactionRecord.getLineItemValue('item', 'item', 1) || '';
                            var columns = nlapiLookupField('item', record_id, fields);
                            credit =
                                // 317;
                                columns[fields[0]] || '';
                            if (record_id) {
                                debit =
                                    // 327;
                                    transactionRecord.getFieldValue('account') || '';
                            }
                            if (total && debit && credit && tipo_descuento == 1) {

                                lineGL(
                                    customLines,
                                    total,
                                    credit,
                                    debit,
                                    memo + ', Abono'
                                );
                                line++;
                                objSublist.line[line] = {};
                                objSublist.line[line].account = parseInt(credit);
                                objSublist.line[line].debit = parseFloat(total).toFixed(2);
                                objSublist.line[line].entity = parseInt(record_entity);
                                objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                objSublist.line[line].memo = memo + ', Abono ';

                                line++;
                                objSublist.line[line] = [];
                                objSublist.line[line].account = parseInt(debit);
                                objSublist.line[line].credit = parseFloat(total).toFixed(2);
                                objSublist.line[line].entity = parseInt(record_entity);
                                objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                objSublist.line[line].memo = memo + ', Abono ';
                            }

                            line++;
                            objSublist.line[line] = {};
                            objSublist.line[line].account = parseInt(debit);
                            objSublist.line[line].debit = parseFloat(total).toFixed(2);
                            objSublist.line[line].entity = parseInt(entity_empresa);
                            objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                            objSublist.line[line].memo = memo;

                            line++;
                            objSublist.line[line] = [];
                            objSublist.line[line].account = parseInt(credit);
                            objSublist.line[line].credit = parseFloat(total).toFixed(2);
                            objSublist.line[line].entity = parseInt(record_entity);
                            objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                            objSublist.line[line].memo = memo;
                        }
                        break;
                    case 'custpymt':
                        record_entity = transactionRecord.getFieldValue('customer') || '';
                        objField.custbody_drt_nc_createdfrom = transactionRecord.getLineItemValue('apply', 'internalid', 1) || '';
                        objField.custbody_drt_nc_con_je = transactionRecord.getFieldValue('custbody_drt_nc_con_cp') || '';
                        var LineItemCount = transactionRecord.getLineItemCount('apply') || '';
                        nlapiLogExecution('AUDIT', 'LineItemCount', LineItemCount);

                        if (LineItemCount) {
                            total = total_capital;
                            debit =
                                // 617;
                                transactionRecord.getFieldValue('account') || '';
                            var internalid = transactionRecord.getLineItemValue('apply', 'internalid', 1) || '';
                            nlapiLogExecution('AUDIT', 'internalid', internalid);

                            if (internalid) {
                                var record = nlapiLoadRecord('invoice', internalid) || '';
                                var record_id = record.getLineItemValue('item', 'item', 1) || '';

                                var con_cp = transactionRecord.getFieldValue('custbody_drt_nc_con_cp') || '';
                                nlapiLogExecution('AUDIT', 'con_cp', con_cp);

                                if (con_cp) {
                                    // var rp = nlapiLookupField('customrecord_drt_nc_conect', con_cp, ['custrecord_drt_nc_c_transaccion']);
                                    // if (rp.custrecord_drt_nc_c_transaccion) {
                                    //     var salesorder = nlapiLookupField('salesorder', rp.custrecord_drt_nc_c_transaccion, ['custbody_drt_nc_tipo_descuento']) || '';
                                    //     tipo_descuento = salesorder.custbody_drt_nc_tipo_descuento || '';
                                    // }
                                    if (tipo_descuento == 1) {
                                        var entity = nlapiLookupField('customer', record_entity, ['custentity_drt_nc_empresa']);
                                        entity_empresa = entity.custentity_drt_nc_empresa || '';
                                        var totalR = (parseFloat(total_interes) + parseFloat(total_iva));
                                        if (totalR) {
                                            lineGL(
                                                customLines,
                                                totalR,
                                                transactionRecord.getFieldValue('aracct') || '',
                                                transactionRecord.getFieldValue('account') || '',
                                                memo + ', Deuda Empresa ',
                                                ''
                                            );
                                            line++;
                                            objSublist.line[line] = {};
                                            objSublist.line[line].account = parseInt(transactionRecord.getFieldValue('aracct') || '');
                                            objSublist.line[line].debit = parseFloat(totalR).toFixed(2);
                                            objSublist.line[line].entity = parseInt(record_entity);
                                            objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                            objSublist.line[line].memo = memo + ', Deuda Empresa ';

                                            line++;
                                            objSublist.line[line] = [];
                                            objSublist.line[line].account = parseInt(transactionRecord.getFieldValue('account') || '');
                                            objSublist.line[line].credit = parseFloat(totalR).toFixed(2);
                                            objSublist.line[line].entity = parseInt(record_entity);
                                            objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                            objSublist.line[line].memo = memo + ', Deuda Empresa ';

                                            lineGL(
                                                customLines,
                                                totalR,
                                                transactionRecord.getFieldValue('account') || '',
                                                transactionRecord.getFieldValue('aracct') || '',
                                                memo + ', Pago de Cliente ',
                                                entity_empresa
                                            );
                                            line++;
                                            objSublist.line[line] = {};
                                            objSublist.line[line].account = parseInt( /*transactionRecord.getFieldValue('account') || {{}} */ 347);
                                            objSublist.line[line].debit = parseFloat(totalR).toFixed(2);
                                            objSublist.line[line].entity = parseInt(entity_empresa);
                                            objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                            objSublist.line[line].memo = memo + ', Pago de Cliente ';

                                            line++;
                                            objSublist.line[line] = [];
                                            objSublist.line[line].account = parseInt(transactionRecord.getFieldValue('aracct') || '');
                                            objSublist.line[line].credit = parseFloat(totalR).toFixed(2);
                                            objSublist.line[line].entity = parseInt(record_entity);
                                            objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                            objSublist.line[line].memo = memo + ', Pago de Cliente ';

                                            var fields = ['custitem_drt_accounnt_capital'];
                                            if (record_id) {
                                                // var columns = nlapiLookupField('item', record_id, fields);
                                                credit =
                                                    629;
                                                //     columns[fields[0]] || '';
                                            }

                                            line++;
                                            objSublist.line[line] = {};
                                            objSublist.line[line].account = parseInt(347);
                                            objSublist.line[line].debit = parseFloat(total).toFixed(2);
                                            objSublist.line[line].entity = parseInt(entity_empresa);
                                            objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                            objSublist.line[line].memo = memo;

                                            line++;
                                            objSublist.line[line] = [];
                                            objSublist.line[line].account = parseInt(credit);
                                            objSublist.line[line].credit = parseFloat(total).toFixed(2);
                                            objSublist.line[line].entity = parseInt(record_entity);
                                            objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                            objSublist.line[line].memo = memo;

                                            // total = '';
                                        }
                                    } else {
                                        var fields = ['custitem_drt_accounnt_capital'];
                                        if (record_id) {
                                            var columns = nlapiLookupField('item', record_id, fields);
                                            credit =
                                                // 629;
                                                columns[fields[0]] || '';
                                        }

                                        line++;
                                        objSublist.line[line] = {};
                                        objSublist.line[line].account = parseInt(transactionRecord.getFieldValue('account') || '');
                                        objSublist.line[line].debit = parseFloat(total_capital).toFixed(2);
                                        objSublist.line[line].entity = parseInt(record_entity);
                                        objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                        objSublist.line[line].memo = memo;

                                        line++;
                                        objSublist.line[line] = [];
                                        objSublist.line[line].account = parseInt(credit);
                                        objSublist.line[line].credit = parseFloat(total_capital).toFixed(2);
                                        objSublist.line[line].entity = parseInt(record_entity);
                                        objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                        objSublist.line[line].memo = memo;

                                    }
                                }

                            }
                            var excedente = transactionRecord.getFieldValue('custbody_drt_nc_monto_excedente') || '';

                            if (debit && excedente) {

                                lineGL(
                                    customLines,
                                    excedente,
                                    debit,
                                    438,
                                    memo + ', Excedente',
                                    transactionRecord.getFieldValue('customer') || ''
                                );
                                line++;
                                objSublist.line[line] = {};
                                objSublist.line[line].account = parseInt(debit);
                                objSublist.line[line].debit = parseFloat(excedente).toFixed(2);
                                objSublist.line[line].entity = parseInt(transactionRecord.getFieldValue('customer') || '');
                                objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                objSublist.line[line].memo = memo;

                                line++;
                                objSublist.line[line] = [];
                                objSublist.line[line].account = parseInt(438);
                                objSublist.line[line].credit = parseFloat(excedente).toFixed(2);
                                objSublist.line[line].entity = parseInt(transactionRecord.getFieldValue('customer') || '');
                                objSublist.line[line].custcol_drt_nc_identificador_uuid = objField.custbody_drt_nc_identificador_uuid;
                                objSublist.line[line].memo = memo;

                            }

                        }
                        break;

                    default:
                        break;
                }
                nlapiLogExecution('AUDIT', 'objField', JSON.stringify(objField));
                nlapiLogExecution('AUDIT', 'objSublist', JSON.stringify(objSublist));
                if (Object.keys(objField).length > 0 && Object.keys(objSublist.line).length > 0) {
                    idRecord = createRecord('journalentry', objField, objSublist);
                    nlapiLogExecution('AUDIT', 'idRecord', JSON.stringify(idRecord));
                }
            } else {
                for (var je in transaccionRepetida.data) {
                    idRecord.success = true;
                    idRecord.data = je;
                    break;
                }
            }
            nlapiLogExecution('AUDIT', 'idRecord', JSON.stringify(idRecord));

            if (idRecord.success) {
                nlapiSubmitField(typeRecord[type.toLowerCase()], id, 'custbody_drt_nc_transaccion_ajuste', idRecord.data);
            }
        }

    } catch (error) {
        nlapiLogExecution('ERROR', 'Error customizeGlImpact', JSON.stringify(error));
    }
}

function createRecord(param_type, param_field, param_sublist) {
    try {
        var respuesta = {
            success: false,
            data: ''
        };
        nlapiLogExecution('AUDIT', 'createRecord',
            ' param_type: ' + JSON.stringify(param_type) +
            ' param_field: ' + JSON.stringify(param_field) +
            ' param_sublist: ' + JSON.stringify(param_sublist)
        );
        if (param_type) {
            var recordCreate = nlapiCreateRecord(param_type);
            if (param_field) {
                for (var f in param_field) {
                    recordCreate.setFieldValue(f, param_field[f]);
                }
            }
            if (param_sublist) {
                for (var sublist in param_sublist) {
                    for (var line in param_sublist[sublist]) {
                        recordCreate.selectNewLineItem(sublist);
                        for (var field in param_sublist[sublist][line]) {
                            nlapiLogExecution('AUDIT', 'param_sublist[' + sublist + '][' + line + '][' + field + ']', JSON.stringify(param_sublist[sublist][line][field]));
                            if (
                                param_sublist[sublist][line][field]
                            ) {
                                recordCreate.setCurrentLineItemValue(sublist, field, param_sublist[sublist][line][field]);
                            }
                        }
                        recordCreate.commitLineItem(sublist);
                    }
                }
            }
            respuesta.data = nlapiSubmitRecord(recordCreate, true) || '';
        }
        respuesta.success = respuesta.data != '';

    } catch (error) {
        nlapiLogExecution('AUDIT', 'error', JSON.stringify(error));

    } finally {
        nlapiLogExecution('AUDIT', 'respuesta', JSON.stringify(respuesta));

        return respuesta;
    }
}

function lineGL(customLines, param_amount, param_account_debit, param_account_credit, param_memo, entityIdEmpresa) {
    try {
        /**
          nlapiLogExecution('AUDIT', 'lineGL',
            // ' customLines: '+customLines+
            ' param_amount: ' + param_amount +
            ' param_account_debit: ' + param_account_debit +
            ' param_account_credit: ' + param_account_credit +
            ' param_memo: ' + param_memo +
            ' entityIdEmpresa: ' + entityIdEmpresa
        );

        if (
            customLines &&
            param_amount &&
            param_account_debit &&
            param_account_credit
        ) {


            param_amount = parseFloat(param_amount);
            param_account_debit = parseInt(param_account_debit);
            param_account_credit = parseInt(param_account_credit);
            if (param_amount > 0) {
                var newLineDebit = customLines.addNewLine();
                newLineDebit.setAccountId(param_account_debit);
                newLineDebit.setDebitAmount(param_amount);
                if (entityIdEmpresa) {
                    newLineDebit.setEntityId(parseInt(entityIdEmpresa));
                }
                newLineDebit.setMemo(param_memo);

                var newLineCredit = customLines.addNewLine();
                newLineCredit.setAccountId(param_account_credit);
                newLineCredit.setCreditAmount(param_amount);
                // if (entityIdEmpresa) {
                //     newLineCredit.setEntityId(parseInt(entityIdEmpresa));
                // }
                newLineCredit.setMemo(param_memo);
            }
        }
         */
    } catch (error) {
        nlapiLogExecution('ERROR', 'error', JSON.stringify(error));
    }
}

function searchTransaccion(param_folio, param_amortizacion) {
    try {
        var objReturn = {
            success: false,
            data: {},
        };
        if (param_folio) {
            nlapiLogExecution('AUDIT', 'searchTransaccion', 'param_folio: ' + param_folio);
            var filters = [
                ["custbody_drt_nc_identificador_folio", "is", param_folio],
                "AND",
                ["type", "anyof", "Journal"]
            ];

            var columns = [
                new nlobjSearchColumn("custbody_drt_nc_num_amortizacion"),
                new nlobjSearchColumn("custbody_drt_nc_identificador_folio"),
                new nlobjSearchColumn("custbody_drt_nc_identificador_uuid")
            ];

            var detalles = nlapiSearchRecord('transaction', null, filters, columns) || [];


            for (var a = 0; a < detalles.length; a++) {
                var identificador_folio = detalles[a].getValue('custbody_drt_nc_identificador_folio') || 0;
                var identificador_uuid = detalles[a].getValue('custbody_drt_nc_identificador_uuid') || 0;
                var num_amortizacion = detalles[a].getValue('custbody_drt_nc_num_amortizacion') || 0;

                if (identificador_folio == param_folio && num_amortizacion == param_amortizacion) {
                    if (!objReturn.data[detalles[a].id]) {
                        objReturn.data[detalles[a].id] = {
                            identificador_folio: identificador_folio,
                            identificador_uuid: identificador_uuid,
                        };
                    }
                }
            }
        }
        objReturn.success = Object.keys(objReturn.data).length > 0;
    } catch (error) {
        nlapiLogExecution('ERROR', 'error searchTransaccion', JSON.stringify(error));
    } finally {
        nlapiLogExecution('AUDIT', 'objReturn searchTransaccion', JSON.stringify(objReturn));
        return objReturn;
    }
}