/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record', './drt_cn_lib', 'N/runtime', 'N/format'],
    function (search, record, drt_cn_lib, runtime, format) {

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
                    type: objvalue.recordType,
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
                        switch (parametro.recordType) {
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
                                    if (salesOrder.data.commpany) {
                                        objupdate.custrecord_drt_nc_c_company = salesOrder.data.commpany;
                                        mensajeFinal.push('Se genero empresa con id: ' + objupdate.custrecord_drt_nc_c_entity);
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
                            type: data.recordType,
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

                var objField_empresa = {};
                var objAddress_empresa = {};
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
                //Emmpresa
                if (parametro.empresa && parametro.empresa.custentity_mx_rfc) {
                    var searchcompany = searchidentificador(record.Type.CUSTOMER, 'custentity_mx_rfc', parametro.empresa.custentity_mx_rfc);
                    if (searchcompany.success) {
                        for (var resultado in searchcompany.data) {
                            respuesta.data.commpany = resultado;
                        }
                    } else {

                        if (parametro.empresa.isperson) {
                            objField_empresa.isperson = "T";
                            objField_empresa.firstname = parametro.empresa.firstname;
                            objField_empresa.lastname = parametro.empresa.lastname;
                        } else {
                            parametro.empresa.isperson = "F";
                            objField_empresa.companyname = parametro.empresa.companyname;
                        }

                        if (parametro.empresa.custentity_drt_nc_uuid_yuhu) {
                            objField_empresa.custentity_drt_nc_uuid_yuhu = parametro.empresa.custentity_drt_nc_uuid_yuhu;
                        }
                        if (parametro.empresa.email) {
                            objField_empresa.email = parametro.empresa.email;
                        }
                        if (parametro.empresa.custentity_mx_rfc) {
                            objField_empresa.custentity_mx_rfc = parametro.empresa.custentity_mx_rfc;
                        }
                        if (
                            parametro.empresa.addressbook &&
                            parametro.empresa.addressbook.custrecord_streetname &&
                            parametro.empresa.addressbook.custrecord_streetnum &&
                            parametro.empresa.addressbook.city &&
                            parametro.empresa.addressbook.state &&
                            parametro.empresa.addressbook.zip
                        ) {
                            objAddress_empresa.addressbook = {};
                            objAddress_empresa.addressbook.country = 'MX';
                            if (parametro.empresa.addressbook.custrecord_streetname) {
                                objAddress_empresa.addressbook.custrecord_streetname = parametro.empresa.addressbook.custrecord_streetname;
                            }
                            if (parametro.empresa.addressbook.custrecord_streetnum) {
                                objAddress_empresa.addressbook.custrecord_streetnum = parametro.empresa.addressbook.custrecord_streetnum;
                            }
                            if (parametro.empresa.addressbook.custrecord_unit) {
                                objAddress_empresa.addressbook.custrecord_unit = parametro.empresa.addressbook.custrecord_unit;
                            }
                            if (parametro.empresa.addressbook.custrecord_colonia) {
                                objAddress_empresa.addressbook.custrecord_colonia = parametro.empresa.addressbook.custrecord_colonia;
                            }
                            if (parametro.empresa.addressbook.state) {
                                objAddress_empresa.addressbook.state = parametro.empresa.addressbook.state;
                            }
                            if (parametro.empresa.addressbook.zip) {
                                objAddress_empresa.addressbook.zip = parametro.empresa.addressbook.zip;
                            }
                            if (parametro.empresa.addressbook.custrecord_village) {
                                objAddress_empresa.addressbook.custrecord_village = parametro.empresa.addressbook.custrecord_village;
                            }
                            if (parametro.empresa.addressbook.city) {
                                objAddress_empresa.addressbook.city = parametro.empresa.addressbook.city;
                            }
                            if (parametro.empresa.isperson) {
                                objAddress_empresa.addressbook.addressee = parametro.empresa.firstname + ' ' + parametro.empresa.lastname;
                            } else {
                                objAddress_empresa.addressbook.addressee = parametro.empresa.companyname;
                            }

                        }

                        var crear_empresa = drt_cn_lib.createRecord(record.Type.CUSTOMER, objField_empresa, {}, objAddress_empresa);
                        if (crear_empresa.success) {
                            respuesta.data.commpany = crear_empresa.data;
                        }

                    }
                }
                //Cliente
                if (!cliente && parametro.custentity_drt_nc_curp) {
                    var searchcustomer = searchidentificador(record.Type.CUSTOMER, 'custentity_drt_nc_curp', parametro.custentity_drt_nc_curp);
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
                    if (parametro.customer.custentity_drt_nc_curp) {
                        objField_customer.custentity_drt_nc_curp = parametro.customer.custentity_drt_nc_curp;
                    }
                    if (parametro.customer.custentity_drt_nc_uuid_yuhu) {
                        objField_customer.custentity_drt_nc_uuid_yuhu = parametro.customer.custentity_drt_nc_uuid_yuhu;
                    }
                    if (parametro.customer.email) {
                        objField_customer.email = parametro.customer.email;
                    }
                    if (parametro.customer.custentity_mx_rfc) {
                        objField_customer.custentity_mx_rfc = parametro.customer.custentity_mx_rfc;
                    }
                    if (respuesta.data.commpany) {
                        objField_customer.parent = respuesta.data.commpany;
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

                    var objAddress = {};
                    if (
                        parametro.customer.addressbook &&
                        parametro.customer.addressbook.custrecord_streetname &&
                        parametro.customer.addressbook.custrecord_streetnum &&
                        parametro.customer.addressbook.city &&
                        parametro.customer.addressbook.statedisplayname &&
                        parametro.customer.addressbook.zipcode
                    ) {
                        objAddress.addressbook = {};
                        objAddress.addressbook.country = 'MX';
                        if (parametro.customer.addressbook.custrecord_streetname) {
                            objAddress.addressbook.custrecord_streetname = parametro.customer.addressbook.custrecord_streetname;
                        }
                        if (parametro.customer.addressbook.custrecord_streetnum) {
                            objAddress.addressbook.custrecord_streetnum = parametro.customer.addressbook.custrecord_streetnum;
                        }
                        if (parametro.customer.addressbook.custrecord_unit) {
                            objAddress.addressbook.custrecord_unit = parametro.customer.addressbook.custrecord_unit;
                        }
                        if (parametro.customer.addressbook.custrecord_colonia) {
                            objAddress.addressbook.custrecord_colonia = parametro.customer.addressbook.custrecord_colonia;
                        }
                        if (parametro.customer.addressbook.statedisplayname) {
                            objAddress.addressbook.zipcode = parametro.customer.addressbook.statedisplayname;
                            objAddress.addressbook.state = parametro.customer.addressbook.statedisplayname;
                        }
                        if (parametro.customer.addressbook.zipcode) {
                            objAddress.addressbook.statedisplayname = parametro.customer.addressbook.zipcode;
                            objAddress.addressbook.zip = parametro.customer.addressbook.zipcode;
                        }
                        if (parametro.customer.addressbook.custrecord_village) {
                            objAddress.addressbook.custrecord_village = parametro.customer.addressbook.custrecord_village;
                        }
                        if (parametro.customer.addressbook.city) {
                            objAddress.addressbook.city = parametro.customer.addressbook.city;
                        }
                        if (parametro.customer.isperson) {
                            objAddress.addressbook.addressee = parametro.customer.firstname + ' ' + parametro.customer.lastname;
                        } else {
                            objAddress.addressbook.addressee = parametro.customer.companyname;
                        }

                    }
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

                if (parametro.trandate) {
                    objField_transaction.trandate = format.parse({
                        value: parametro.trandate,
                        type: format.Type.DATE
                    });
                }

                if (parametro.custbody_drt_nc_identificador_folio) {
                    objField_transaction.custbody_drt_nc_identificador_folio = parametro.custbody_drt_nc_identificador_folio;
                } else {
                    respuesta.error.push('Hace falta identificador_folio:' + parametro.custbody_drt_nc_identificador_folio);
                }

                if (parametro.custbody_drt_nc_identificador_uuid) {
                    objField_transaction.custbody_drt_nc_identificador_uuid = parametro.custbody_drt_nc_identificador_uuid;
                    var transaccionExistente = searchidentificador(search.Type.TRANSACTION, 'custbody_drt_nc_identificador_uuid', objField_transaction.custbody_drt_nc_identificador_uuid);
                    if (transaccionExistente.success) {
                        respuesta.data.transaccion = transaccionExistente.data;
                        respuesta.error.push('Existe  una transaccion  con  el mismo custbody_drt_nc_identificador_uuid:' + transaccionExistente.data);
                    }
                } else {
                    respuesta.error.push('Hace falta identificador_uuid:' + parametro.custbody_drt_nc_identificador_uuid);
                }

                if (parametro.custbody_drt_nc_tipo_descuento && parseInt(parametro.custbody_drt_nc_tipo_descuento) > 0) {
                    objField_transaction.custbody_drt_nc_tipo_descuento = parametro.custbody_drt_nc_tipo_descuento;
                }

                if (parametro.custbody_drt_nc_folio_sustitucion) {
                    objField_transaction.custbody_drt_nc_folio_sustitucion = parametro.custbody_drt_nc_folio_sustitucion;
                }

                if (parametro.class) {
                    objField_transaction.class = parametro.class;
                }

                objField_transaction.custbody_drt_nc_con_so = param_objdata.id;
                objField_transaction.orderstatus = 'B';

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
                            custcol_drt_nc_fecha: format.parse({
                                value: parametro.item[liena].fecha,
                                type: format.Type.DATE
                            }),
                            custcol_drt_nc_num_amortizacion: parametro.item[liena].num_amortizacion
                        });
                        objSublist_transaction.item.push({
                            item: articulo_interes,
                            price: "-1",
                            quantity: 1,
                            rate: parametro.item[liena].interes,
                            custcol_drt_nc_fecha: format.parse({
                                value: parametro.item[liena].fecha,
                                type: format.Type.DATE
                            }),
                            custcol_drt_nc_num_amortizacion: parametro.item[liena].num_amortizacion
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