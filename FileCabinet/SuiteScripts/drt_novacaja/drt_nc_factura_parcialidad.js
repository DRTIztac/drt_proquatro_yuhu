/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search'],

    function (record, search) {

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
        const param_record = { journal: "journalentry" };
        const notificacion = { yuhu: "custbody_drt_nc_pendiente_enviar", conexion: "custbody_drt_nc_con_je", creadoDesde:"custbody_drt_nc_createdfrom"};
        function getInputData() {

            const param_registro = 'customsearch_drt_ss_line_salesorder';
            var respuesta = [];
            var transactionSearchObj = search.load({
                id: param_registro
            });


            var defaultFilters = transactionSearchObj.filters;

            var allFilters = defaultFilters;
            transactionSearchObj.filters = allFilters;


            return transactionSearchObj;
        }


        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */
        function map(context) {
            const notPendiente = "custbody_drt_nc_notificacion_registro";
            const notificacionYuhu = "custbody_drt_nc_pendiente_enviar";
            const notCreado = "custbody_drt_nc_createdfrom";
            const notinvoice = "custbody_drt_nc_con_in";
            const notSalesOrder = "custbody_drt_nc_con_so";
            const notCashSale = "custbody_drt_nc_con_cs";
            const notPayment = "custbody_drt_nc_con_cp";

            const paramcol_capital = "custcol_drt_nc_monto_capital";
            const paramcol_interes = "custcol_drt_nc_monto_interes";
            const paramcol_iva = "custcol_drt_nc_monto_iva";     

            const paramcus_capital = "custbody_drt_nc_total_capital";
            const paramcus_interes = "custbody_drt_nc_total_interes";
            const paramcus_iva = "custbody_drt_nc_total_iva";     
            const paramcus_amortizacion = "custbody_drt_nc_num_amortizacion";     
            

            const formSales2Cash = 88;

            const PAGO = {
                NORMAL: 0,
                MORATORIO: 1,
                CAPITAL_PARCIAL: 2,
                CAPITAL_TOTAL: 3
            };

            var rowJson = JSON.parse(context.value),
                rowValues = rowJson.values,
                itemValues = rowValues.item;

            log.debug({ title: "JSON DETAIL", details: JSON.stringify(rowJson) });
            log.debug({ title: "TEST", details: "" });

            try {
                var id = rowValues.tranid;
                var fecha = rowValues.custcol_drt_nc_fecha;
                var amortizacion = rowValues.custcol_drt_nc_num_amortizacion;
                var conexion = rowValues.custbody_drt_nc_con_so;


                log.debug({ title: "id amortizacion", details: id + fecha });

                /*
                 * {"recordType":"salesorder"
                 * ,"id":"1543",
                 * "values":{"tranid":"85",
                 * "item":
                 * {"value":"17","text":"ARTICULO INTERES"},"custcol2":"","custcol_drt_nc_fecha":"2020-06-19","custcol_drt_nc_num_amortizacion":"2"}}*/

                var recordType = record.Type.INVOICE;
                log.debug({ title: "recordType", details: recordType });

                var currRegValue = "";


                var invrec = record.transform({
                    'fromType': record.Type.SALES_ORDER,
                    'fromId': Number(rowJson.id),
                    'toType': recordType,
                    'isDynamic': true
                });


                var itemcount = invrec.getLineCount({ "sublistId": "item" });

                log.debug({ title: "itemcount", details: itemcount });
                for (var j = itemcount - 1; j >= 0; j--) {


                    var sublistFieldValue = invrec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_drt_nc_num_amortizacion',
                        line: j
                    });

              

                    if (amortizacion != sublistFieldValue) {
                        invrec.removeLine({
                            sublistId: 'item',
                            line: j
                        });
                    } else {
                        var col_capital = invrec.getSublistValue({
                            sublistId: 'item',
                            fieldId: paramcol_capital,
                            line: j
                        });

                        var col_interes = invrec.getSublistValue({
                            sublistId: 'item',
                            fieldId: paramcol_interes,
                            line: j
                        });
                        var col_iva = invrec.getSublistValue({
                            sublistId: 'item',
                            fieldId: paramcol_iva,
                            line: j
                        });


                        invrec.setValue({
                            fieldId: paramcus_capital,
                            value: col_capital
                        });
                        invrec.setValue({
                            fieldId: paramcus_interes,
                            value: col_interes
                        });
                        invrec.setValue({
                            fieldId: paramcus_iva,
                            value: col_iva
                        });
                        invrec.setValue({
                            fieldId: paramcus_amortizacion,
                            value: amortizacion

                        });

                    }
                }
                currRegValue = invrec.getValue({
                    fieldId: notSalesOrder
                });
                invrec.setValue({ fieldId: notinvoice, value: currRegValue });

            

                invrec.setValue({ fieldId: 'custbody_drt_nc_num_amortizacion', value: amortizacion });
                invrec.setValue({ fieldId: notificacionYuhu, value: true });
                invrec.setValue({ fieldId: notPendiente, value: "" });
                invrec.setValue({ fieldId: notCreado, value: Number(rowJson.id) });

                

                
                invrec.setValue({fieldId: notSalesOrder,value: ""});

                var invoiceid = invrec.save({
                    'enableSourcing': true,
                    'ignoreMandatoryFields': true
                });

             
                log.debug({ title: "generated invoice id", details: invoiceid })
                
                if (rowValues.custbody_drt_nc_tipo_descuento.text == "Retención") {

                    //GENERA PAGO
                    var payment = record.transform({
                        'fromType': record.Type.INVOICE,
                        'fromId': invoiceid,
                        'toType': record.Type.CUSTOMER_PAYMENT,
                        'isDynamic': true
                    });

               
                    payment.setValue({ fieldId: notPayment, value: currRegValue });

                    payment.setValue({ fieldId: notinvoice, value: "" });

                    payment.setValue({ fieldId: 'custbody_drt_nc_num_amortizacion', value: amortizacion });
                    payment.setValue({ fieldId: notificacionYuhu, value: true });
                    payment.setValue({ fieldId: notPendiente, value: "" });
                    payment.setValue({ fieldId: notCreado, value: Number(rowJson.id) });


                    var paymentId = payment.save({
                        'enableSourcing': true,
                        'ignoreMandatoryFields': true
                    });
                    log.debug({ title: "pago generado", details: paymentId })



                    //GENERA ENTRADA DE DIARIO Y PAGO A INVOICE

                    var conexion = Number(rowValues[notSalesOrder].value);
                    var salesOrder = Number(rowJson.id);

                    //ENTRADA DE DIARIO
                    //TRASPASO DE DEUDA A EMPRESA A TRAVES DE ENTRADA DE DIARIO
                    var total = 0;
                    var objJournal = { line_field: [] };
                    if (rowValues[paramcol_capital] != 0) {
                        total = Number(rowValues[paramcol_capital]);
                        var accountCapital = 
                        objJournal = createObjJournalEntry(rowValues["custentity_drt_nc_empresa.customer"].value, 629, rowValues[paramcol_capital], true, conexion, salesOrder);
                    }

                    if (rowValues[paramcol_interes] != 0) {
                        if (Number(rowValues[paramcol_iva])) {
                            total += Number(rowValues[paramcol_iva]);
                        }
                        if (Number(rowValues[paramcol_interes])) {
                            total += Number(rowValues[paramcol_interes]);
                        }

                        var objJournal_2 = createObjJournalEntry(rowValues["custentity_drt_nc_empresa.customer"].value, 630, (Number(rowValues[paramcol_interes]) + Number(rowValues[paramcol_iva])).toFixed(2), true, conexion, salesOrder);
                        if (!objJournal.body_field) { objJournal = objJournal_2; }
                        objJournal.line_field = objJournal.line_field.concat(objJournal_2.line_field);
                        objJournal.body_field.custbody_drt_nc_total_transaccion = total.toFixed(2);

                    }


                    log.debug({ title: "objJournal", details: objJournal });
                    if (objJournal.body_field) {
                        objJournal.body_field.custbody_drt_nc_identificador_folio = rowValues["custbody_drt_nc_identificador_folio"];
                        objJournal.body_field.custbody_drt_nc_identificador_uuid = rowValues["custbody_drt_nc_identificador_uuid"];
                        var journal2 = createTransaction(param_record.journal, objJournal);

                    }
                    

                }


                //ACTUALIZA SALES RECORD 
                var salesRec = record.load({
                    type: record.Type.SALES_ORDER,
                    id: rowJson.id,
                    isDynamic: true
                });

                var itemcount = salesRec.getLineCount({ "sublistId": "item" });
                var control = false;
                for (var i = 0; i < itemcount; i++) {
                    var intquantity = salesRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantitybilled',
                        line: i
                    });
                    var drtInvoice = salesRec.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_drt_nc_invoice',
                        line: i
                    });
                    

                    if (intquantity == 1 && drtInvoice == "") {
                        control = true;
                        log.debug({ title: "Invoice" + invoiceid, details: "Enter on change 2" });
                        salesRec.selectLine({ sublistId: "item", line: i });

                        salesRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_drt_nc_invoice',
                            value: Number(invoiceid)

                        });

                        salesRec.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_drt_nc_facturado',
                            value: true

                        });
                        salesRec.commitLine({
                            sublistId: "item"
                        });

                    }
                    if (!(intquantity == 1 && drtInvoice == "") && control) {
                        continue;
                    }
                }

                salesRec.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                });

            } catch (error) {
                log.debug({ title: "error", details: error })

            }
        }


        function searchItemAccount(item) {

            var account = {
                capital: "",
                interest: ""
            };

            return account;
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
                log.debug({ title: "jsonPayment error ", details: error });


            }
            return respuesta;


        }


        function createObjJournalEntry( entity, accountDebit, amount, isDebit,conexion,salesOrder ) {

            try {

                var account = 617;
                var objJournalEntry = {
                    body_field: {
                        
                    },
                    line_field: []
                };

                objJournalEntry.body_field[notificacion.yuhu] = true;
                objJournalEntry.body_field[notificacion.conexion] = conexion;
                objJournalEntry.body_field[notificacion.creadoDesde] = salesOrder;

                var lineItem =
                {
                    sublist: "line",
                    account: account,
                    debit: amount,
                    
                };
                objJournalEntry.line_field.push(lineItem);
                var lineItem =
                {
                    sublist: "line",
                    account: accountDebit,
                    entity: entity,
                    credit: amount
                };
                objJournalEntry.line_field.push(lineItem);

                return objJournalEntry;
            } catch (error) {
                throw error;
            }

        }

        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
        function reduce(context) {

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
        };

    });
