/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './drt_cn_lib', 'N/runtime'],
    function (search, record, drt_cn_lib, runtime) {

        function getInputData() {
            try {
                var respuesta = search.create({
                    type: 'customrecord_drt_nc_conect',
                    columns: [
                        'custrecord_drt_nc_c_context',
                        'custrecord_drt_nc_c_http',
                        'custrecord_drt_nc_c_procesando',
                        'custrecord_drt_nc_c_terminado',
                        'custrecord_drt_nc_c_respuesta',
                        'custrecord_drt_nc_c_resultado',
                        'custrecord_drt_nc_c_error',
                        'custrecord_drt_nc_c_transaccion',
                        'custrecord_drt_nc_c_entity'
                    ],
                    filters: [
                        ['isinactive', search.Operator.IS, 'F'],
                        'and',
                        ['custrecord_drt_nc_c_procesando', search.Operator.IS, 'F'],
                        'and',
                        ['custrecord_drt_nc_c_terminado', search.Operator.IS, 'F'],
                        'and',
                        ['custrecord_drt_nc_c_http', search.Operator.IS, 'POST'],
                        'and',
                        ['custrecord_drt_nc_c_context', search.Operator.ISNOTEMPTY, null],
                        'and',
                        ['custrecord_drt_nc_c_transaccion', search.Operator.ANYOF, '@NONE@']

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
                    type: objvalue.recordtype,
                    id: objvalue.id,
                    values: {
                        custrecord_drt_nc_c_procesando: true
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
                            custrecord_drt_nc_c_procesando: false,
                            custrecord_drt_nc_c_error: ''
                        };
                        var data = JSON.parse(recordData[ids]);
                        log.emergency({
                            title: 'data',
                            details: JSON.stringify(data)
                        });

                        var parametro = JSON.parse(data.values.custrecord_drt_nc_c_context);
                        var mensajeFinal = [];
                        switch (parametro.recordtype) {
                            case 'salesorder': {
                                var salesOrder = procesarSalesOrder(data);
                                if (salesOrder.success) {
                                    if (salesOrder.data.transaccion) {
                                        objupdate.custrecord_drt_nc_c_transaccion = salesOrder.data.transaccion;
                                        mensajeFinal.push('Se genero la orden de venta con id: ' + objupdate.custrecord_drt_nc_c_transaccion);
                                    }
                                    if (salesOrder.data.cliente) {
                                        objupdate.custrecord_drt_nc_c_entity = salesOrder.data.cliente;
                                        mensajeFinal.push('Se genero cliente con id: ' + objupdate.custrecord_drt_nc_c_entity);
                                    }
                                } else {}
                                if (salesOrder.error.length > 0) {
                                    objupdate.custrecord_drt_nc_c_error = JSON.stringify(salesOrder.error);
                                    mensajeFinal.push('Error: ' + objupdate.custrecord_drt_nc_c_error);
                                }
                            }
                            break;

                        default:
                            mensajeFinal.push('Opción no valida: ' + parametro.recordtype);
                            break;
                        }
                        objupdate.custrecord_drt_nc_c_resultado = mensajeFinal.join();



                    } catch (error) {
                        log.error({
                            title: 'error reduce',
                            details: JSON.stringify(error)
                        });
                        objupdate.custrecord_drt_nc_c_error = JSON.stringify(error);
                    } finally {
                        log.audit({
                            title: 'objupdate',
                            details: JSON.stringify(objupdate)
                        });
                        var idUpdate = record.submitFields({
                            type: data.recordtype,
                            id: data.id,
                            values: objupdate,
                            options: {
                                enableSourcing: true,
                                ignoreMandatoryFields: true
                            }
                        });
                        var body = drt_cn_lib.responseYuhu(idUpdate);
                        var dataWebhook = drt_cn_lib.bookWebhook('credito_inicial');
                        if (body.success && dataWebhook.success) {
                            var sendYuhu = drt_cn_lib.postWebhook(dataWebhook.data.header, dataWebhook.data.url, body.data);
                        }
                    }
                }
            } catch (error) {
                log.error({
                    title: 'error reduce',
                    details: JSON.stringify(error)
                });
                objupdate.custrecord_drt_nc_c_error = JSON.stringify(error);
            }
        }

        function procesarSalesOrder(param_objdata) {
            try {
                var respuesta = {
                    success: false,
                    data: {},
                    error: []
                };

                var cliente = '';
                var objField_customer = {};
                var objSublist_customer = {};
                var objField_transaction = {};
                var objAddress = {};
                var objSublist_transaction = {
                    item: [],
                };
                var parametro = JSON.parse(param_objdata.values.custrecord_drt_nc_c_context);
                if (param_objdata.values.custrecord_drt_nc_c_entity.value) {
                    cliente = param_objdata.values.custrecord_drt_nc_c_entity.value;
                }
                if (!cliente && parametro.curp_cliente) {
                    var searchcustomer = drt_cn_lib.searchRecord(record.Type.CUSTOMER, [
                        ['isinactive', search.Operator.IS, 'F'], 'and', ['custentity_drt_nc_curp', search.Operator.IS, parametro.curp_cliente]
                    ], [{
                        name: 'custentity_drt_nc_curp'
                    }]);
                    if (searchcustomer.success) {
                        for (var resultado in searchcustomer.data) {
                            cliente = resultado;
                        }
                    }
                }
                if (!cliente) {
                    if (parametro.customer.isperson) {
                        objField_customer.isperson = "T";
                        objField_customer.firstname = parametro.customer.firstname;
                        objField_customer.lastname = parametro.customer.lastname;
                    } else {
                        objField_customer.isperson = "F";
                        objField_customer.companyname = parametro.customer.companyname;
                    }
                    if (parametro.customer.curp_cliente) {
                        objField_customer.custentity_drt_nc_curp = parametro.customer.curp_cliente;
                    }
                    if (parametro.customer.email) {
                        objField_customer.email = parametro.customer.email;
                    }
                    if (parametro.customer.custentity_mx_rfc) {
                        objField_customer.custentity_mx_rfc = parametro.customer.custentity_mx_rfc;
                    }



                    if (parametro.customer.addressbook) {
                        objAddress.addressbook = {};
                        if (parametro.customer.addressbook.addr1) {
                            objAddress.addressbook.addr1 = parametro.customer.addressbook.addr1;
                        }
                        if (parametro.customer.addressbook.addr2) {
                            objAddress.addressbook.addr2 = parametro.customer.addressbook.addr2;
                        }
                        if (parametro.customer.addressbook.addr3) {
                            objAddress.addressbook.addr3 = parametro.customer.addressbook.addr3;
                        }
                        if (parametro.customer.addressbook.zip) {
                            objAddress.addressbook.zip = parametro.customer.addressbook.zip;
                        }
                        if (parametro.customer.addressbook.addressee) {
                            objAddress.addressbook.addressee = parametro.customer.addressbook.addressee;
                        }
                        if (parametro.customer.addressbook.city) {
                            objAddress.addressbook.city = parametro.customer.addressbook.city;
                        }
                        if (parametro.customer.addressbook.country) {
                            objAddress.addressbook.country = parametro.customer.addressbook.country;
                        }
                        if (parametro.customer.addressbook.state) {
                            objAddress.addressbook.state = parametro.customer.addressbook.state;
                        }
                    }

                    var addes = {
                        custrecord_streetname: "calle",
                        custrecord_streetnum: "numero_exterior",
                        custrecord_unit: "numero_interior",
                        custrecord_colonia: "colonia",
                        zip: "codigo_postal",
                        state: "estado",
                        custrecord_village: "municipio",
                        city: "municipio",
                        country: "MX",
                        addressee: "destinatario",
                    };
                    var newentity = drt_cn_lib.createRecord(record.Type.CUSTOMER, objField_customer, objAddress);

                    if (newentity.success) {
                        cliente = newentity.data;
                    }
                    if (Object.keys(newentity.error).length > 0) {
                        respuesta.error.push('Error al generar cliente: ' + newentity.error.message);
                    }


                }

                if (cliente) {
                    respuesta.data.cliente = cliente;
                    objField_transaction.entity = cliente;
                } else {
                    respuesta.error.push('Hace falta cliente:' + cliente);
                }

                if (parametro.location) {
                    objField_transaction.location = parametro.location;
                } else {
                    respuesta.error.push('Hace falta location:' + location);
                }

                if (parametro.identificador_folio) {
                    objField_transaction.custbody_drt_nc_identificador_folio = parametro.identificador_folio;
                } else {
                    respuesta.error.push('Hace falta identificador_folio:' + identificador_folio);
                }

                if (parametro.identificador_uuid) {
                    objField_transaction.custbody_drt_nc_identificador_uuid = parametro.identificador_uuid;
                } else {
                    respuesta.error.push('Hace falta identificador_uuid:' + identificador_uuid);
                }


                var articulo_capital = runtime.getCurrentScript().getParameter({
                    name: 'custscript_drt_nc_articulo_capital'
                }) || '';
                var articulo_interes = runtime.getCurrentScript().getParameter({
                    name: 'custscript_drt_nc_articulo_interes'
                }) || '';


                if (articulo_capital && articulo_interes) {
                    for (var liena in parametro.item) {
                        objSublist_transaction.item.push({
                            item: articulo_capital,
                            price: "-1",
                            quantity: 1,
                            rate: parametro.item[liena].capital,
                            custcol_drt_nc_num_amortizacion: parametro.item[liena].num_amortizacion,
                            custcol_drt_nc_fecha: parametro.item[liena].fecha
                        });
                        objSublist_transaction.item.push({
                            item: articulo_interes,
                            price: "-1",
                            quantity: 1,
                            rate: parametro.item[liena].interes,
                            custcol_drt_nc_num_amortizacion: parametro.item[liena].num_amortizacion,
                            custcol_drt_nc_fecha: parametro.item[liena].fecha
                        });

                    }
                } else {
                    respuesta.error.push('Error en la lectura de los articulos: ' + 'articulo de capital: ' + articulo_capital + 'articulo de interes: ' + articulo_interes);
                }

                if (respuesta.error.length > 0) {
                    respuesta.error.push('No se pueden generar la transacción hace falta informacion requerida.');
                } else {
                    var newtransaction = drt_cn_lib.createRecord(record.Type.SALES_ORDER, objField_transaction, objSublist_transaction, objAddress);
                    if (Object.keys(newtransaction.error).length > 0) {
                        respuesta.error.push('Error al generar la transaccion: ' + newtransaction.error.message);
                    }
                    if (newtransaction.success) {
                        respuesta.data.transaccion = newtransaction.data;
                    }
                }

                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.error({
                    title: 'error',
                    details: JSON.stringify(error)
                });
                respuesta.error = error;
            } finally {
                log.emergency({
                    title: 'respuesta procesarSalesOrder',
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

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        }
    });