// JavaScript source code
/**
* @NApiVersion 2.1
* @NScriptType MapReduceScript
* @NModuleScope SameAccount
*/
define(['N/search', 'N/render', 'N/file', 'N/record', 'N/runtime', 'N/config', 'N/url', 'N/xml', 'N/format'],

    function (search, render, file, record, runtime, config, url, xml, format) {
        const notPendiente = "custbody_drt_nc_notificacion_registro";        
        const notCreado = "custbody_drt_nc_createdfrom";
        const notinvoice = "custbody_drt_nc_con_in";
        const notificacionYuhu = "custbody_drt_nc_pendiente_enviar";
        const notCheque = "custbody_drt_nc_con_ch";
        const notPagoTipo = "custbody_drt_nc_tipo_pago";
        const notPago = "custbody_drt_nc_con_cp";
        const notCash = "custbody_drt_nc_con_cs";
        const notJournal = "custbody_drt_nc_con_je";
        
        const notInteres  = "custbody_drt_nc_total_capital";
        const notCapital  = "custbody_drt_nc_total_interes";
        const notIva      = "custbody_drt_nc_total_iva";

        const notTotal    = "custbody_drt_nc_total_transaccion";
        
        
        

        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         *
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 2015.1
         */
        function getInputData() {
            var customrecord_drt_nc_pagosSearchObj = search.create({
                type: "customrecord_drt_nc_pagos",
                filters:
                    [
                        ["isinactive", "is", "F"],
                         "AND",
                        ["custrecord_drt_nc_p_transaccion", "isempty", ""]

                    ],
                columns:
                    [
                        search.createColumn({
                            name: "custrecord_drt_nc_p_conexion",
                            sort: search.Sort.ASC,
                            label: "Conexion"
                        }),
                        search.createColumn({ name: "custrecord_drt_nc_p_context" }),
                        search.createColumn({ name: "custrecord_drt_nc_p_invoice" }),
                        search.createColumn({ name: "externalid", label: "External ID" }),
                        search.createColumn({ name: "isinactive", label: "Inactive" }),
                        search.createColumn({ name: "internalid", label: "Internal ID" }),
                        search.createColumn({ name: "custrecord_drt_nc_p_transaccion", label: "Transaccion" })
                    ]
            });
            //var searchResultCount = customrecord_drt_nc_pagosSearchObj.runPaged().count;
            //log.debug("customrecord_drt_nc_pagosSearchObj result count",searchResultCount);


            return customrecord_drt_nc_pagosSearchObj;

        }

        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */

        function getRegistroPago(uuidYuhu) {


            var vendorpaymentSearchObj = search.create({
                type: "vendorpayment",
                filters:
                    [
                        ["mainline", "is", "T"],
                        "AND",
                        ["type", "anyof", "VendPymt"],
                        "AND",
                        ["custbody_drt_nc_identificador_uuid", "is", uuidYuhu]
                    ],
                columns:
                    [
                        search.createColumn({
                            name: "trandate",
                            sort: search.Sort.ASC
                        }),
                        "type",
                        search.createColumn({
                            name: "tranid",
                            sort: search.Sort.ASC
                        }),
                        "transactionnumber",
                        "entity",
                        "account",
                        "otherrefnum",
                        "statusref",
                        "memo",
                        "currency",
                        "fxamount",
                        "amount",
                        "custbody_psg_ei_inbound_edocument",
                        "custbody_drt_nc_identificador_uuid"
                    ]
            });
            var searchResultCount = vendorpaymentSearchObj.runPaged().count;

            log.debug({ details: searchResultCount });
            return searchResultCount > 0;


        }
        function map(context) {

            const PAGO = {
                NORMAL: 1,
                MORATORIO: 2,
                CAPITAL_PARCIAL: 3,
                CAPITAL_TOTAL: 4
            };

            const param_record = { deposito: 'check', cashsale: "CASHSALE", salesOrder: "SALES_ORDER", journal: "journalentry" };
            const notificacionYuhu = "custbody_drt_nc_pendiente_enviar";

            var jsonRecord = JSON.parse(context.value);

            log.debug({ title: 'jsonPayment unescaped', details: JSON.stringify(jsonRecord) });

            var record_pagos = record.load({
                id: Number(jsonRecord.id),
                type: jsonRecord.recordType,
                isDynamic: true,
            });


            var jsonPayment = JSON.parse(unescape(jsonRecord.values.custrecord_drt_nc_p_context));

            try {
                log.debug({ title: 'jsonPayment unescaped', details: JSON.stringify(jsonPayment) });
            } catch (error) {
                log.debug({ title: 'error', details: error });
                record_pagos.setValue({ fieldId: 'custrecord_drt_nc_p_error', value: error });
                 var updateId = record_pagos.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            }); 
            }

            try {
                var obody_field = {};
                var oPayment = {};
                var arrLine = [];

                var dataCustomer = getCustomerData(jsonPayment.internalid) || getOrderCustomerData(jsonPayment.record);//getCustomerData(jsonPayment.internalid)||getOrderCustomerData(jsonPayment.record);
                var customer = dataCustomer;
                var invoice = Number(jsonPayment.internalid);
                var existePago = getRegistroPago(jsonPayment.custbody_drt_nc_identificador_uuid);
                var tipo_pago = jsonPayment.custbody_drt_nc_tipo_pago;


                obody_field.custbody_drt_nc_identificador_uuid = jsonPayment.custbody_drt_nc_identificador_uuid;
                obody_field.custbody_drt_nc_identificador_folio = jsonPayment.custbody_drt_nc_identificador_folio;

                if (!existePago) {
                    var esTotal = false;
                    log.debug("tipo_pago" + tipo_pago);
                    
                    switch (tipo_pago) {
                        case PAGO.NORMAL:
                        if(jsonPayment.custbody_drt_nc_total_interes>0){
                            var idPago=pago_simple(customer, jsonPayment, invoice);
                            record_pagos.setValue({ fieldId: 'custrecord_drt_nc_p_transaccion', value: Number(idPago) });

                        }
                          /*

                            if (jsonPayment.custbody_drt_nc_total_capital > 0) {

                                    var dateTransdate = new Date(Date.parse(jsonPayment.trandate, "YYYY-MM-dd") + 24 * 60 * 60 * 1000);
                                    var entity = parseInt(customer);
                                    var capital = jsonPayment.custbody_drt_nc_total_capital;
                                    var isDebit = true;
                                    var accountDebit = jsonPayment.account;

                           

                                    var objJournal = createObjJournalEntry(dateTransdate, entity, accountDebit, capital, isDebit);
                                    log.debug({ title: "objJournal", details: JSON.stringify(objJournal) });

                                    objJournal.body_field[notificacionYuhu] = true;
                                    objJournal.body_field[notJournal] = jsonPayment.record;
                                    objJournal.body_field.custbody_drt_nc_identificador_folio = jsonPayment.custbody_drt_nc_identificador_folio;
                                    objJournal.body_field.custbody_drt_nc_identificador_uuid = jsonPayment.custbody_drt_nc_identificador_uuid;
                                    objJournal.body_field[notIva] = jsonPayment[notIva];
                                    objJournal.body_field[notInteres] = jsonPayment[notInteres];
                                    objJournal.body_field[notCapital] = jsonPayment[notCapital];
                                    objJournal.body_field[notTotal] = jsonPayment["total"];
                                    objJournal.body_field[notCreado] = jsonPayment.internalid;
                                    



                                    var journal = createTransaction(param_record.journal, objJournal);

                                    log.debug({ title: "objJournal", details: JSON.stringify(journal) });

                                }

                            */
                            if (jsonPayment.excedente > 0) {
                                var param_body = {  
                                    entity: customer,
                                    account: 317,
                                    custbody_drt_nc_pendiente_enviar: true,

                                }
                                param_body[notificacionYuhu] = true;
                                param_body[notCreado] = parseInt(idPago);
                                param_body[notCheque] = parseInt(jsonPayment.record);
                       
                                var line_field = [{
                                    sublist: "expense",
                                    taxcode: 5,
                                    account: 617,
                                    amount: jsonPayment.excedente

                                }];
                                var line_field = [{ sublist: "payment", amount: Number(jsonPayment.excedente) }];
                                log.debug({ title: 'o', details: JSON.stringify(param_body) });
                                var deposit = createTransaction(param_record.deposito, { param_body: param_body, line_field: line_field });
                                log.debug({ title: "createTransaction ", details: JSON.stringify(deposit) });

                            }
                            break;
                        case PAGO.CAPITAL_TOTAL:
                            esTotal = true;


                        case PAGO.CAPITAL_PARCIAL:



                            try {

                                if (jsonPayment.custbody_drt_nc_total_interes > 0) {
                                    var objCashSale = createObjCashSale(customer, jsonPayment.interes);
                                   // objCashSale.body_field[notificacionYuhu] = true;
                                    //objCashSale.body_field[notCash] = jsonPayment.internalid;

                                    var oCashSale = createTransaction(param_record.cashsale, objCashSale);
                                }
                                if (jsonPayment.custbody_drt_nc_total_capital > 0) {
                                    var dateTransdate = new Date(Date.parse(jsonPayment.trandate, "YYYY-MM-dd") + 24 * 60 * 60 * 1000);
                                    var entity = customer;
                                    var capital = jsonPayment.custbody_drt_nc_total_capital;
                                    var isDebit = true;
                                    var accountDebit = jsonPayment.account;

                                    log.debug({ title: "objJournal", details: JSON.stringify(dateTransdate) });
                           

                                    var objJournal = createObjJournalEntry(dateTransdate, entity, accountDebit, capital, isDebit);
                                    objJournal.body_field[notificacionYuhu] = true;
                                    //objJournal.body_field[notJournal] = jsonPayment.record;

                                    var journal = createTransaction(param_record.journal, objJournal);

                                    log.debug({ title: "objJournal", details: JSON.stringify(journal) });

                                }


                                log.debug({ title: "Cambio", details: JSON.stringify(oCashSale) });

                                var ajuste = ajustar_sales_order({ esTotal: esTotal, salesorderId: jsonPayment.internalid, items: jsonPayment.item });


                            } catch (error) {
                                log.debug({ title: "ERROR", details: JSON.stringify(error) });
                            }



                            break;
                        case PAGO.MORATORIO:
                            var idPago=pago_simple(customer, jsonPayment, invoice);
                            record_pagos.setValue({ fieldId: 'custrecord_drt_nc_p_transaccion', value: Number(idPago) });

                            break;
                        default:

                    }








                } else {
                    record_pagos.setValue({ fieldId: 'custrecord_drt_nc_p_error', value: "ya existe registro en pagos de " + jsonPayment.custbody_drt_nc_identificador_uuid });

                }
                var updateId = record_pagos.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            }); 
            } catch (error) {
                record_pagos.setValue({ fieldId: 'custrecord_drt_nc_p_error', value: JSON.stringify(error) });
                   
                log.emergency({ title: "Error al generar payment", details: error });
            } finally {
                log.debug("Finally");
                 var updateId = record_pagos.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });          

            }
            //record_pagos.setValue({ fieldId: 'isinactive', value: true });
            
            log.debug("Sales Order updated", updateId);
        }
        function createObjCashSale(customer, rate) {


            var lineItem =
            {
                sublist: "item",
                item: 17,
                quantity: 1,
                price: -1,
                rate: 0
            };


            var objcashSale = {
                body_field: {
                    entity: customer,
                    subsidiary: 1,
                    location: 1,
                    
                },
                line_field: []
            };
            lineItem.rate = rate;
            objcashSale.line_field.push(lineItem);
            log.debug({ title: "cashsale", details: JSON.stringify(objcashSale) });
            return objcashSale;

        }

        function createObjJournalEntry(dateTransdate, entity, accountDebit, amount, isDebit) {

            try {

                var account = 629;
                var objJournalEntry = {
                    body_field: {
                        trandate: dateTransdate,
                    },
                    line_field: []
                };


                var lineItem =
                {
                    sublist: "line",
                    account: account,
                    credit: amount,
                    entity: entity
                };
                objJournalEntry.line_field.push(lineItem);
                var lineItem =
                {
                    sublist: "line",
                    account: accountDebit,
                    debit: amount
                };
                objJournalEntry.line_field.push(lineItem);

                log.debug({ title: "journal", details: JSON.stringify(objJournalEntry) });
                return objJournalEntry;
            } catch (error) {
                throw error;
            }

        }
        function createObjSalesOrder(rate) {


            var lineItem =
            {
                sublist: "item",
                item: 1,
                quantity: 1,
                price: -1,
                rate: 0
            };


            var objcashSale = {
                body_field: {
                    entity: 1828,
                    subsidiary: 2,
                    location: 49,
                    departament: 9
                },
                line_field: []
            };
            lineItem.rate = rate;
            objcashSale.line_field.push(lineItem);
            return objcashSale;

        }




        function pago_simple(customer, jsonPayment, invoice) {
      

            var obody_field = {};
            var oPayment = {};
            var arrLine = [];

            obody_field.customer = parseInt(customer);
            obody_field.subsidiary = 1;
            obody_field[notPagoTipo] = jsonPayment[notPagoTipo];
            obody_field.account = jsonPayment.account;
            obody_field.custbody_drt_nc_identificador_uuid = jsonPayment.custbody_drt_nc_identificador_uuid;
            obody_field.custbody_drt_nc_identificador_folio = jsonPayment.custbody_drt_nc_identificador_folio;

            obody_field[notIva] = jsonPayment[notIva];
            obody_field[notInteres] = jsonPayment[notInteres];
            obody_field[notCapital] = jsonPayment[notCapital];
            obody_field[notTotal] = jsonPayment["total"];

            obody_field[notificacionYuhu] = true;
            

            var line = {
                internalid: invoice,
                amount: jsonPayment.custbody_drt_nc_total_interes+ jsonPayment.custbody_drt_nc_total_iva
            };
            arrLine.push(line);
            oPayment.body_field = obody_field;
            oPayment.param_line = arrLine;

            log.debug({ title: 'oPayment', details: JSON.stringify(oPayment) });


            var oPayment = createPayment(oPayment.body_field, oPayment.param_line);
            if (oPayment.success) {
                log.debug({ title: 'oPayment', details: "success" });
                // record_pagos.setValue({ fieldId: 'custrecord_drt_nc_p_transaccion', value: oPayment.data });
            } else {
                throw new Error(JSON.stringify(oPayment.error));
            }

            return oPayment.data;

        }


        function createTransaction(param_record, objParam) {
            var respuesta = {
                success: false,
                data: '',
                error: {}
            };
            try {
                if (!param_record) {
                    throw new Error(error);
                }
                var nuevo_registro = record.create({
                    type: param_record,
                    isDynamic: true
                });


                var param_body = objParam.body_field;
                var param_line = objParam.line_field;
                for (var fieldId in param_body) {
                    nuevo_registro.setValue({
                        fieldId: fieldId,
                        value: param_body[fieldId]
                    });
                }

                var curSublist;
                for (var fieldId in param_line) {


                    for (var i in param_line[fieldId]) {
                        curSublist = param_line[fieldId]["sublist"] || "item";
                        if (fieldId == 0) {
                            nuevo_registro.selectNewLine({
                                sublistId: curSublist
                            });
                        }



                        log.debug({ title: "param_line[fieldId][i]", details: param_line[fieldId][i] + "" + i });

                        if (i != "sublist") {
                            nuevo_registro.setCurrentSublistValue({
                                sublistId: curSublist,
                                fieldId: i,
                                value: param_line[fieldId][i]
                            });
                        }

                    }
                    nuevo_registro.commitLine({
                        sublistId: curSublist
                    });
                }

                respuesta.data = nuevo_registro.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                }) || '';
                respuesta.success = respuesta.data != "";

            } catch (error) {
                respuesta.error = error;
                log.debug({ title: "transaction error ", details: error });


            }
            return respuesta;


        }


        function createPayment(param_body, param_line) {

            const param_record = 'customerpayment';
            try {
                var respuesta = {
                    success: false,
                    data: '',
                    error: {}
                };

                if (param_record) {
                    var nuevo_registro = record.create({
                        type: param_record,
                        isDynamic: true
                    });
                    if (param_body) {
                        for (var fieldId in param_body) {
                            nuevo_registro.setValue({
                                fieldId: fieldId,
                                value: param_body[fieldId]
                            });
                        }
                    }
                    if (param_line) {

                        var lineCount = nuevo_registro.getLineCount({
                            sublistId: 'apply'
                        }) || 0;

                        log.audit({
                            title: 'lineCount',
                            details: JSON.stringify(lineCount)
                        });
                        for (var invoice = 0; invoice < param_line.length; invoice++) {
                            for (var renglon = 0; renglon < lineCount; renglon++) {
                                log.audit({
                                    title: 'renglon',
                                    details: JSON.stringify(renglon)
                                });
                                nuevo_registro.selectLine({
                                    sublistId: 'apply',
                                    line: renglon
                                });
                                log.debug({
                                    title: "internalId", details: nuevo_registro.getCurrentSublistValue({
                                        sublistId: 'apply',
                                        fieldId: 'internalid',
                                    })
                                });
                                if (
                                    nuevo_registro.getCurrentSublistValue({
                                        sublistId: 'apply',
                                        fieldId: 'internalid',
                                    }) ==
                                    param_line[invoice].internalid
                                ) {
                                    log.debug({
                                        title: "setting true", details: nuevo_registro.getCurrentSublistValue({
                                            sublistId: 'apply',
                                            fieldId: 'internalid',
                                        }) + "true"
                                    });
                                    nuevo_registro.setCurrentSublistValue({
                                        sublistId: 'apply',
                                        fieldId: 'apply',
                                        value: true
                                    });

                                    nuevo_registro.setCurrentSublistValue({
                                        sublistId: 'apply',
                                        fieldId: 'amount',
                                        value: param_line[invoice].amount
                                    });
                                }
                            }
                        }
                    }
                    respuesta.data = nuevo_registro.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    }) || '';
                }
                respuesta.success = respuesta.data != '';
            } catch (error) {
                respuesta.error = error;
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
        function getCustomerData(idInvoice) {
            try {

                var record_invoice = record.load({
                    id: idInvoice,
                    type: 'invoice',
                    isDynamic: false,
                });

                var customer = record_invoice.getValue({
                    fieldId: 'entity'
                });
                return customer;


            } catch (error) {
                return null;
            }
        }
        function getOrderCustomerData(idSalesOrder) {
            try {

                var record_invoice = record.load({
                    id: parseInt(idSalesOrder),
                    type: 'salesorder',
                    isDynamic: false,
                });

                var customer = record_invoice.getValue({
                    fieldId: 'entity'
                });
                log.debug({ title: "sales", details: idSalesOrder + "" + customer })
                return customer;


            } catch (error) {
                return null;
            }
        }
        function ajustar_sales_order(objSalesOrder) {

            const param_record = 'salesorder';
            const fieldsublist = "item";
            //esTotal:esTotal , items:jsonPayment.item 
            var respuesta = {
                success: false,
                data: '',
                error: {}
            };
            try {



                var actualizarReg = record.load({
                    type: param_record,
                    id: objSalesOrder.salesorderId,
                    isDynamic: true
                });


                actualizarReg.setValue({
                    fieldId: notificacionYuhu,
                    value: true
                });



                var lineCount = actualizarReg.getLineCount({
                    sublistId: fieldsublist
                }) || 0;

                log.audit({
                    title: ' SALES',
                    details: JSON.stringify(objSalesOrder)
                });
                var arrAmort = objRenderArray(objSalesOrder.items, "num_amortizacion");
                var numMax = getMaxOfArray(arrAmort);
                var numMin = getMinOfArray(arrAmort);
                log.debug({ title: "maximo minimo", details: numMax + " " + numMin + JSON.stringify(arrAmort) })
                for (var renglon = 0; renglon < lineCount; renglon++) {

                    actualizarReg.selectLine({
                        sublistId: fieldsublist,
                        line: renglon
                    });
                    var isInvoiced = actualizarReg.getCurrentSublistValue({
                        sublistId: fieldsublist,
                        fieldId: 'linkedordbill',
                    });


                    if (isInvoiced == "F") {
                        if (objSalesOrder.esTotal) {
                            actualizarReg.setCurrentSublistValue({
                                sublistId: fieldsublist,
                                fieldId: 'amount',
                                value: 0
                            });
                            actualizarReg.commitLine({ sublistId: "item" });

                        } else {
                            var numAmort = actualizarReg.getCurrentSublistValue({
                                sublistId: fieldsublist,
                                fieldId: 'custcol_drt_nc_num_amortizacion',
                            });


                            if (numMax < parseInt(numAmort)) {
                                log.debug({ title: "salesOrder", details: "numamort" + numAmort });

                                actualizarReg.setCurrentSublistValue({
                                    sublistId: fieldsublist,
                                    fieldId: 'rate',
                                    value: 0
                                });

                                actualizarReg.commitLine({ sublistId: "item" });
                            } else {

                                var indexAmort = arrAmort.indexOf(numAmort);
                                if (indexAmort >= 0) {
                                    actualizarReg.setCurrentSublistValue({
                                        sublistId: fieldsublist,
                                        fieldId: 'rate',
                                        value: objSalesOrder.items[indexAmort]["interes"]
                                    });
                                    actualizarReg.commitLine({ sublistId: "item" });

                                }
                            }

                        }

                    }

                }

                respuesta.data = actualizarReg.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                }) || '';

                respuesta.success = respuesta.data != '';
            } catch (error) {
                respuesta.error = error;
                log.error({
                    title: 'error ajustar salesOrder',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta salesOrder',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }

        }

        function objRenderArray(arrayObj, idT) {
            var newArray = [];

            for (var i in arrayObj) {

                newArray.push(arrayObj[i][idT]);

            }

            return newArray;
        }

        function getMaxOfArray(numArray) {
            return Math.max.apply(null, numArray);
        }

        function getMinOfArray(numArray) {
            return Math.min.apply(null, numArray);
        }
        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
        function reduce(context) {
            // log.debug({title:"reduce",details:JSON.stringify(JSON.parse(context)) });

        }

        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
        function summarize(summary) {

        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });
