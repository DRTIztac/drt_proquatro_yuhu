function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
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
    var exchangerate = transactionRecord.getFieldValue('exchangerate') || '1';
    var numberOfApply = transactionRecord.getLineItemCount('apply') || '';
    var subsidiary = transactionRecord.getFieldValue('subsidiary') || '';
    exchangerate = parseFloat(exchangerate);
    var custbody_drt_nc_total_iva = transactionRecord.getFieldValue('custbody_drt_nc_total_iva') || '';
    var custbody_drt_nc_con_cp = transactionRecord.getFieldValue('custbody_drt_nc_con_cp') || '';

    nlapiLogExecution('AUDIT', 'id', id);
    nlapiLogExecution('AUDIT', 'type', type);
    nlapiLogExecution('AUDIT', 'exchangerate', exchangerate);
    nlapiLogExecution('AUDIT', 'numberOfApply', numberOfApply);
    nlapiLogExecution('AUDIT', 'subsidiary', subsidiary);

    var configuration = getConfiguracion(subsidiary, listTypeRecord[type.toLowerCase()]);
    if (configuration.success) {
        var array_internal_id = [];
        var trantype = '';
        var objAplly = {};
        for (var i = 1; i <= numberOfApply; i++) {
            if (transactionRecord.getLineItemValue('apply', 'apply', i) == "T") {
                var internalid = transactionRecord.getLineItemValue('apply', 'internalid', i) || '';
                trantype = transactionRecord.getLineItemValue('apply', 'trantype', i) || '';

                array_internal_id.push(internalid);
                objAplly[internalid] = {
                    due: transactionRecord.getLineItemValue('apply', 'total', i) || '',
                    amount: transactionRecord.getLineItemValue('apply', 'amount', i) || '',
                    trantype: trantype,
                    porcentaje: 0
                };
                if (
                    objAplly[internalid].amount &&
                    objAplly[internalid].due
                ) {
                    objAplly[internalid].porcentaje = objAplly[internalid].amount / objAplly[internalid].due;
                }
            }
        }
        nlapiLogExecution('AUDIT', 'array_internal_id', JSON.stringify(array_internal_id));
        nlapiLogExecution('AUDIT', 'trantype', JSON.stringify(trantype));
        nlapiLogExecution('AUDIT', 'objAplly', JSON.stringify(objAplly));
        var dataTran = {
            success: false
        };
        if (array_internal_id.length > 0) {
            dataTran = amountTransaction(array_internal_id, typeRecord[trantype.toLowerCase()], configuration.array_tax);

        } else {
            dataTran = amountTransaction([id], typeRecord[type.toLowerCase()], configuration.array_tax);
            objAplly[id] = {
                amount: transactionRecord.getFieldValue('total') || 0,
                due: transactionRecord.getFieldValue('total') || 0,
                porcentaje: 1
            };
        }

        if (dataTran.success) {
            for (var transaccion in dataTran.data) {
                for (var impuesto in dataTran.data[transaccion]) {
                    nlapiLogExecution('AUDIT', 'dataTran.data[transaccion][impuesto]', JSON.stringify(dataTran.data[transaccion][impuesto]));
                    nlapiLogExecution('AUDIT', 'configuration.data[dataTran.data[transaccion][impuesto]', JSON.stringify(configuration.data[dataTran.data[transaccion][impuesto].taxitem]));
                    nlapiLogExecution('AUDIT', 'objAplly[transaccion]', JSON.stringify(objAplly[transaccion]));
                    if (dataTran.data[transaccion][impuesto].taxitem && configuration.data[dataTran.data[transaccion][impuesto].taxitem]) {
                        var porcentaje = objAplly[transaccion].porcentaje;
                        var impuestoPagado = parseFloat(dataTran.data[transaccion][impuesto].fxamount * exchangerate) * porcentaje;
                        configuration.data[dataTran.data[transaccion][impuesto].taxitem].total += impuestoPagado;
                        configuration.data[dataTran.data[transaccion][impuesto].taxitem].diferencia +=
                            impuestoPagado -
                            (
                                dataTran.data[transaccion][impuesto].netamountnotax *
                                porcentaje
                            );
                    }
                }
            }
            if (custbody_drt_nc_con_cp) {
                for (var taxCon in configuration.data) {
                    if (
                        configuration.data[taxCon]
                    ) {
                        configuration.data[taxCon].total = parseFloat(custbody_drt_nc_total_iva);
                    }
                }
            }
            for (var taxConfig in configuration.data) {
                nlapiLogExecution('AUDIT', 'configuration.data[taxConfig]', JSON.stringify(configuration.data[taxConfig]));
                if (
                    configuration.data[taxConfig] &&
                    configuration.data[taxConfig].debit &&
                    configuration.data[taxConfig].credit &&
                    configuration.data[taxConfig].total &&
                    configuration.data[taxConfig].total.toFixed(2) != 0
                ) {
                    lineGL(
                        customLines,
                        configuration.data[taxConfig].total,
                        configuration.data[taxConfig].debit,
                        configuration.data[taxConfig].credit,
                        'Reclasificacion de Impuesto :' + configuration.data[taxConfig].taxcode_text
                    );
                }

                if (
                    configuration.data[taxConfig] &&
                    configuration.data[taxConfig].perdida_ganancia &&
                    configuration.data[taxConfig].perdida_credit &&
                    configuration.data[taxConfig].diferencia &&
                    configuration.data[taxConfig].diferencia.toFixed(2) != 0
                ) {
                    var gananciaPerdidaA = configuration.data[taxConfig].perdida_ganancia;
                    var gananciaPerdidaB = configuration.data[taxConfig].perdida_credit;
                    if (
                        typeRecord[type.toLowerCase()] &&
                        (
                            typeRecord[type.toLowerCase()] == 'vendorbill' ||
                            typeRecord[type.toLowerCase()] == 'vendorpayment' ||
                            typeRecord[type.toLowerCase()] == 'vendorcredit'
                        )
                    ) {
                        gananciaPerdidaA = configuration.data[taxConfig].perdida_credit;
                        gananciaPerdidaB = configuration.data[taxConfig].perdida_ganancia;

                    }
                    lineGL(
                        customLines,
                        configuration.data[taxConfig].diferencia,
                        gananciaPerdidaA,
                        gananciaPerdidaB,
                        'Diferencia cambiaria - Perdida / Ganancia'
                    );
                }
            }
        }
        nlapiLogExecution('AUDIT', 'configuration', JSON.stringify(configuration));

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
            filters.push(new nlobjSearchFilter('internalid', null, 'anyof', param_array_id));
            filters.push(new nlobjSearchFilter('taxline', null, 'is', 'T'));
            if (param_array_tax_item) {
                filters.push(new nlobjSearchFilter('taxitem', null, 'anyof', param_array_tax_item));
            }
            var columns = [
                new nlobjSearchColumn('total'),
                new nlobjSearchColumn('fxamount'),
                new nlobjSearchColumn('netamountnotax'),
                new nlobjSearchColumn('taxtotal'),
                new nlobjSearchColumn('taxitem'),
                new nlobjSearchColumn('taxamount'),
                new nlobjSearchColumn('exchangerate')
            ];


            var detalles = nlapiSearchRecord(param_recordtype, null, filters, columns) || [];
            nlapiLogExecution('AUDIT', 'detalles', JSON.stringify(detalles));

            for (var a = 0; a < detalles.length; a++) {
                var netamountnotax = detalles[a].getValue('netamountnotax') || 0;
                var total = detalles[a].getValue('total') || 0;
                var fxamount = detalles[a].getValue('fxamount') || 0;
                var taxtotal = detalles[a].getValue('taxtotal') || 0;
                var taxitem = detalles[a].getValue('taxitem') || '';
                var exchangerate = detalles[a].getValue('exchangerate') || 1;
                var taxamount = detalles[a].getValue('taxamount') || 1;
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
                            taxamount: taxamount * 1,
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