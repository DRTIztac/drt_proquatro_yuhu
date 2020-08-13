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

        var id = transactionRecord.getFieldValue('id');
        var type = transactionRecord.getFieldValue('type');

        var identificador_uuid = transactionRecord.getFieldValue('custbody_drt_nc_identificador_uuid') || '';
        var identificador_folio = transactionRecord.getFieldValue('custbody_drt_nc_identificador_folio') || '';
        var total_capital = transactionRecord.getFieldValue('custbody_drt_nc_total_capital') || '';
        var total_interes = transactionRecord.getFieldValue('custbody_drt_nc_total_interes') || '';
        var total_iva = transactionRecord.getFieldValue('custbody_drt_nc_total_iva') || '';
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

        if (identificador_uuid && identificador_folio) {
            switch (type) {
                case 'custinvc':
                    var LineItemCount = transactionRecord.getLineItemCount('item') || '';
                    if (LineItemCount) {
                        total = total_capital;
                        credit =
                            // 317;
                            transactionRecord.getFieldValue('account') || '';
                        var record_id = transactionRecord.getLineItemValue('item', 'item', 1) || '';
                        var fields = ['custitem_drt_accounnt_capital']
                        if (record_id) {
                            var columns = nlapiLookupField('item', record_id, fields);
                            debit =
                                // 327;
                                columns[fields[0]] || '';
                        }
                    }
                    break;
                case 'cashsale':
                    var LineItemCount = transactionRecord.getLineItemCount('item') || '';
                    if (LineItemCount) {
                        total = total_capital;
                        credit =
                            // 317;
                            transactionRecord.getFieldValue('account') || '';
                        var record_id = transactionRecord.getLineItemValue('item', 'item', 1) || '';
                        var fields = ['custitem_drt_accounnt_capital']
                        if (record_id) {
                            var columns = nlapiLookupField('item', record_id, fields);
                            debit =
                                // 327;
                                columns[fields[0]] || '';
                        }
                        if (total && debit && credit && tipo_descuento == 1) {

                            lineGL(
                                customLines,
                                total,
                                credit,
                                debit,
                                memo + ', Abono'
                            );
                            memo += ', Cargo'
                        }
                    }
                    break;
                case 'custpymt':
                    var LineItemCount = transactionRecord.getLineItemCount('apply') || '';
                    if (LineItemCount) {
                        total = total_capital;
                        debit =
                            // 617;
                            transactionRecord.getFieldValue('account') || '';
                        var internalid = transactionRecord.getLineItemValue('apply', 'internalid', 1) || '';
                        if (internalid) {
                            var record = nlapiLoadRecord('invoice', internalid) || '';
                            var record_id = record.getLineItemValue('item', 'item', 1) || '';
                            var fields = ['custitem_drt_accounnt_capital']
                            if (record_id) {
                                var columns = nlapiLookupField('item', record_id, fields);
                                credit =
                                    // 629;
                                    columns[fields[0]] || '';
                            }
                        }
                    }
                    break;

                default:
                    break;
            }
        }
        if (total && debit && credit) {
            lineGL(
                customLines,
                total,
                debit,
                credit,
                memo
            );
        }

    } catch (error) {
        nlapiLogExecution('ERROR', 'Error customizeGlImpact', JSON.stringify(error));
    }
}

function lineGL(customLines, param_amount, param_account_debit, param_account_credit, param_memo) {
    try {
        nlapiLogExecution('AUDIT', 'lineGL',
            // ' customLines: '+customLines+
            ' param_amount: ' + param_amount +
            ' param_account_debit: ' + param_account_debit +
            ' param_account_credit: ' + param_account_credit +
            ' param_memo: ' + param_memo
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
                newLineDebit.setMemo(param_memo);

                var newLineCredit = customLines.addNewLine();
                newLineCredit.setAccountId(param_account_credit);
                newLineCredit.setCreditAmount(param_amount);
                newLineCredit.setMemo(param_memo);
            } else {
                param_amount *= -1;
                var newLineDebit = customLines.addNewLine();
                newLineDebit.setAccountId(param_account_credit);
                newLineDebit.setDebitAmount(param_amount);
                newLineDebit.setMemo(param_memo);

                var newLineCredit = customLines.addNewLine();
                newLineCredit.setAccountId(param_account_debit);
                newLineCredit.setCreditAmount(param_amount);
                newLineCredit.setMemo(param_memo);
            }
        }
    } catch (error) {
        nlapiLogExecution('ERROR', 'error', JSON.stringify(error));
    }
}

function amountTransaction(param_array_id, param_recordtype, param_array_tax_item) {
    try {
        var objReturn = {
            success: false,
            data: {}
        };
        nlapiLogExecution('AUDIT', 'amountTransaction', 'param_array_id: ' + param_array_id + ' param_recordtype: ' + param_recordtype + ' param_array_tax_item: ' + JSON.stringify(param_array_tax_item));
        if (param_array_id && param_recordtype) {
            var filters = [];
            filters.push(['internalid', 'anyof', param_array_id]);
            filters.push('AND');
            filters.push(['taxline', 'is', 'T']);
            filters.push('AND');
            filters.push(["accounttype", "noneof", "@NONE@"]);
            filters.push('AND');
            filters.push(["amount", "notequalto", "0.00"]);
            filters.push('AND');
            filters.push(["hasnullamount", "is", "F"]);

            var columns = [
                new nlobjSearchColumn("internalid", "taxCode", null),
                new nlobjSearchColumn("account"),
                new nlobjSearchColumn("amount"),
                new nlobjSearchColumn("debitamount"),
                new nlobjSearchColumn("creditamount"),
                new nlobjSearchColumn('exchangerate')
            ];


            var detalles = nlapiSearchRecord(param_recordtype, null, filters, columns) || [];
            nlapiLogExecution('AUDIT', 'detalles', JSON.stringify(detalles));

            for (var a = 0; a < detalles.length; a++) {
                var netamountnotax = detalles[a].getValue('amount') || 0;
                var total = detalles[a].getValue('amount') || 0;
                var fxamount = detalles[a].getValue('amount') || 0;
                var taxtotal = detalles[a].getValue('amount') || 0;
                var taxitem = detalles[a].getValue("internalid", "taxCode", null) || '';
                var exchangerate = detalles[a].getValue('exchangerate') || 1;


                if (taxitem) {
                    if (!objReturn.data[detalles[a].id]) {
                        objReturn.data[detalles[a].id] = {}
                    }
                    if (!objReturn.data[detalles[a].id][taxitem]) {
                        objReturn.data[detalles[a].id][taxitem] = {
                            total: total * 1,
                            taxtotal: taxtotal * 1,
                            exchangerate: exchangerate * 1,
                            taxitem: taxitem,
                            total_e: (total * 1) / exchangerate,
                            fxamount: fxamount * 1,
                            netamountnotax: netamountnotax * 1,
                            tax: 0
                        };
                    }

                    if (
                        objReturn.data[detalles[a].id][taxitem].fxamount &&
                        objReturn.data[detalles[a].id][taxitem].exchangerate
                    ) {
                        objReturn.data[detalles[a].id][taxitem].tax =
                            objReturn.data[detalles[a].id][taxitem].fxamount *
                            objReturn.data[detalles[a].id][taxitem].exchangerate;
                    }
                }
            }
        }
        objReturn.success = Object.keys(objReturn.data).length > 0;
    } catch (error) {
        nlapiLogExecution('ERROR', 'error amountTransaction', JSON.stringify(error));
    } finally {
        nlapiLogExecution('AUDIT', 'objReturn amountTransaction', JSON.stringify(objReturn));
        return objReturn;
    }
}

function getConfiguracion(param_subsidiary, param_recordtype) {
    try {
        var objReturn = {
            success: false,
            data: {},
            array_tax: []
        };
        nlapiLogExecution('AUDIT', 'getConfiguracion', 'param_subsidiary: ' + param_subsidiary + ' param_recordtype: ', param_recordtype);
        var filters = [
            ['isinactive', 'is', 'F']
        ];
        if (param_subsidiary) {
            filters.push('AND');
            filters.push(['custrecord_ddt_setup_r_subsidiary', 'anyof', param_subsidiary]);
        }
        if (param_recordtype) {
            filters.push('AND');
            filters.push(['custrecord_ddt_setup_ra_setup.custrecord_ddt_setup_ra_typetran', 'is', param_recordtype]);
        }

        var columns = [
            new nlobjSearchColumn('custrecord_ddt_setup_ra_typetran', 'custrecord_ddt_setup_ra_setup'),
            new nlobjSearchColumn('custrecord_ddt_setup_ra_impuesto', 'custrecord_ddt_setup_ra_setup'),
            new nlobjSearchColumn('custrecord_ddt_setup_ra_debito', 'custrecord_ddt_setup_ra_setup'),
            new nlobjSearchColumn('custrecord_ddt_setup_ra_credito', 'custrecord_ddt_setup_ra_setup'),
            new nlobjSearchColumn('custrecord_ddt_setup_ra_perdida_ganancia', 'custrecord_ddt_setup_ra_setup'),
            new nlobjSearchColumn('custrecord_ddt_setup_ra_setup_credito', 'custrecord_ddt_setup_ra_setup')
        ];

        var searchSetup = nlapiSearchRecord('customrecord_ddt_setup_reclasificacion', null, filters, columns) || [];
        // nlapiLogExecution('AUDIT','searchSetup',JSON.stringify(searchSetup));
        objReturn.data = searchSetup.reduce(function (curr, next) {
            var trantype = next.getValue('custrecord_ddt_setup_ra_typetran', 'custrecord_ddt_setup_ra_setup') || '';
            var taxcode = next.getValue('custrecord_ddt_setup_ra_impuesto', 'custrecord_ddt_setup_ra_setup') || '';
            var taxcode_text = next.getText('custrecord_ddt_setup_ra_impuesto', 'custrecord_ddt_setup_ra_setup') || '';
            var debit = parseFloat(next.getValue('custrecord_ddt_setup_ra_debito', 'custrecord_ddt_setup_ra_setup')) || '';
            var credit = parseFloat(next.getValue('custrecord_ddt_setup_ra_credito', 'custrecord_ddt_setup_ra_setup')) || '';
            var perdida_ganancia = parseFloat(next.getValue('custrecord_ddt_setup_ra_perdida_ganancia', 'custrecord_ddt_setup_ra_setup')) || '';
            var perdida_credit = parseFloat(next.getValue('custrecord_ddt_setup_ra_setup_credito', 'custrecord_ddt_setup_ra_setup')) || '';

            // if(!curr[trantype]){
            //     curr[trantype]={};
            // }
            if (!curr /* [trantype] */ [taxcode]) {
                curr /* [trantype] */ [taxcode] = {
                    taxcode_text: taxcode_text,
                    debit: debit,
                    credit: credit,
                    perdida_ganancia: perdida_ganancia,
                    perdida_credit: perdida_credit,
                    total: 0,
                    diferencia: 0,
                };
                objReturn.array_tax.push(taxcode);
            }
            return curr;
        }, {});
        objReturn.success = Object.keys(objReturn.data).length > 0;
    } catch (error) {
        nlapiLogExecution('ERROR', 'error getConfiguracion', JSON.stringify(error));
    } finally {
        nlapiLogExecution('AUDIT', 'objReturn getConfiguracion', JSON.stringify(objReturn));
        return objReturn;
    }
}