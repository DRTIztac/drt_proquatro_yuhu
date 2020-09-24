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
                                        mensajeFinal.push('Se genero empresa con id: ' + objupdate.custrecord_drt_nc_c_company);
                                    }
                                    if (salesOrder.data.actualizacion) {
                                        mensajeFinal.push('Se actualizo SalesOrder con id: ' + salesOrder.data.actualizacion);
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
                    var searchcompany = drt_cn_lib.searchidentificador(record.Type.CUSTOMER, 'custentity_mx_rfc', parametro.empresa.custentity_mx_rfc);
                    if (searchcompany.success) {
                        respuesta.data.commpany = searchcompany.data;

                    } else {

                        objField_empresa.custentity_drt_nc_pendiente_enviar = true;
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
                        if (Object.keys(crear_empresa.error).length > 0) {
                            respuesta.error.push('Error al generar empresa: ' + crear_empresa.error.message);
                        }

                    }
                }
                //Cliente
                if (!cliente && parametro.custentity_drt_nc_curp) {
                    var searchcustomer = drt_cn_lib.searchidentificador(record.Type.CUSTOMER, 'custentity_drt_nc_curp', parametro.custentity_drt_nc_curp);
                    if (searchcustomer.success) {
                        cliente = searchcustomer.data;
                    }
                }

                if (!cliente) {
                    objField_customer.custentity_drt_nc_pendiente_enviar = true;
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
                    // if (respuesta.data.commpany) {
                    //     objField_customer.custentity_drt_nc_empresa = respuesta.data.commpany;
                    // }
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
                        parametro.customer.addressbook.state &&
                        parametro.customer.addressbook.zip
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
                        if (parametro.customer.addressbook.state) {
                            objAddress.addressbook.state = parametro.customer.addressbook.state;
                        }
                        if (parametro.customer.addressbook.zip) {
                            objAddress.addressbook.zip = parametro.customer.addressbook.zip;
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
                    var newentity = drt_cn_lib.createRecord(record.Type.CUSTOMER, objField_customer, {}, objAddress);


                    if (newentity.success) {
                        cliente = newentity.data;
                    }
                    if (Object.keys(newentity.error).length > 0) {
                        respuesta.error.push('Error al generar cliente: ' + newentity.error.message);
                    }
                    // Street Name, Street Number, ZIP, City, State

                }

                if (cliente) {
                    if (respuesta.data.commpany) {
                        drt_cn_lib.submitRecord(record.Type.CUSTOMER, cliente, {
                            custentity_drt_nc_empresa: respuesta.data.commpany
                        });
                    }

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

                if (parametro.custbody_drt_nc_folio_sustitucion) {
                    objField_transaction.custbody_drt_nc_folio_sustitucion = parametro.custbody_drt_nc_folio_sustitucion;
                    // var sustitucion = drt_cn_lib.searchidentificador(search.Type.TRANSACTION, 'custbody_drt_nc_identificador_folio', objField_transaction.custbody_drt_nc_folio_sustitucion);
                    // if (sustitucion.success) {
                    //     objField_transaction.custbody_drt_nc_createdfrom = sustitucion.data;
                    //     var actualizacion = drt_cn_lib.updateSalesOrder(objField_transaction.custbody_drt_nc_createdfrom, [], true, '');
                    //     if (actualizacion.success) {
                    //         respuesta.data.actualizacion = actualizacion.data;
                    //     } else {
                    //         respuesta.error.push('No se pudo Actualizar la orden de Venta ');
                    //     }
                    // } else {
                    //     respuesta.error.push('No se encontro transaccion a sustituir custbody_drt_nc_folio_sustitucion:' + objField_transaction.custbody_drt_nc_folio_sustitucion);
                    // }
                }

                if (parametro.custbody_drt_nc_identificador_uuid) {
                    objField_transaction.custbody_drt_nc_identificador_uuid = parametro.custbody_drt_nc_identificador_uuid;
                    var transaccionExistente = drt_cn_lib.searchidentificador(search.Type.TRANSACTION, 'custbody_drt_nc_identificador_uuid', objField_transaction.custbody_drt_nc_identificador_uuid);
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


                if (parametro.class) {
                    objField_transaction.class = parametro.class;
                }

                objField_transaction.custbody_drt_nc_con_so = param_objdata.id;
                objField_transaction.custbody_drt_nc_pendiente_enviar = true;
                objField_transaction.orderstatus = 'B';
                if (parametro.custbody_drt_nc_total_iva) {
                    objField_transaction.custbody_drt_nc_total_iva = parametro.custbody_drt_nc_total_iva;
                }
                if (parametro.custbody_drt_nc_total_interes) {
                    objField_transaction.custbody_drt_nc_total_interes = parametro.custbody_drt_nc_total_interes;
                }
                if (parametro.custbody_drt_nc_total_capital) {
                    objField_transaction.custbody_drt_nc_total_capital = parametro.custbody_drt_nc_total_capital;
                }
                if (parametro.total) {
                    objField_transaction.custbody_drt_nc_total_transaccion = parametro.total;
                }

                var articulo_interes = runtime.getCurrentScript().getParameter({
                    name: 'custscript_drt_nc_articulo_interes'
                }) || '';

                var accountDebit = 819;
                if (parametro.custbody_drt_nc_tipo_credito) {
                    articulo_interes = parametro.custbody_drt_nc_tipo_credito;
                }

                if (articulo_interes) {
                    objField_transaction.custbody_drt_nc_tipo_credito = articulo_interes;
                    var cuentaItem = drt_cn_lib.lookup(search.Type.ITEM, articulo_interes, ['custitem_drt_accounnt_capital']);
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

                    for (var liena in parametro.item) {
                        var objPush = {
                            item: articulo_interes,
                            price: "-1",
                            quantity: 1,
                            rate: parametro.item[liena].interes,
                            tax1amt: parametro.item[liena].iva
                        };
                        objPush.isclosed = parametro.item[liena].isclosed == 'T' || parametro.item[liena].isclosed == true;
                        if (parametro.item[liena].custcol_drt_nc_fecha_vencimiento) {
                            objPush.custcol_drt_nc_fecha_vencimiento = format.parse({
                                value: parametro.item[liena].custcol_drt_nc_fecha_vencimiento,
                                type: format.Type.DATE
                            });
                        }
                        if (parametro.item[liena].fecha) {
                            objPush.custcol_drt_nc_fecha = format.parse({
                                value: parametro.item[liena].fecha,
                                type: format.Type.DATE
                            });

                        }
                        objPush.custcol_drt_nc_facturado = parametro.item[liena].custcol_drt_nc_facturado == 'T' || parametro.item[liena].custcol_drt_nc_facturado == true;
                        objPush.custcol_drt_nc_monto_total = parametro.item[liena].total;
                        objPush.custcol_drt_nc_monto_interes = parametro.item[liena].interes;
                        objPush.custcol_drt_nc_num_amortizacion = parametro.item[liena].num_amortizacion;
                        objPush.custcol_drt_nc_monto_capital = parametro.item[liena].capital;
                        objPush.custcol_drt_nc_monto_iva = parametro.item[liena].iva;

                        log.audit({
                            title: 'objPush',
                            details: JSON.stringify(objPush)
                        });
                        objSublist_transaction.item.push(objPush);
                    }
                } else {
                    respuesta.error.push('Error en la lectura de articulo de interes: ' + articulo_interes);
                }

                if (respuesta.error.length > 0) {
                    respuesta.error.push('No se pueden generar la transacción hace falta informacion requerida.');
                } else {
                    var newtransaction = drt_cn_lib.createRecord(record.Type.SALES_ORDER, objField_transaction, objSublist_transaction, {});
                    if (Object.keys(newtransaction.error).length > 0) {
                        respuesta.error.push('Error al generar la transaccion: ' + newtransaction.error.message);
                    }

                    if (newtransaction.success) {
                        respuesta.data.transaccion = newtransaction.data;
                    }

                }
                if (respuesta.data.transaccion && parametro.dispersion && parametro.dispersion.length > 0) {
                    var objSublist_journal = {
                        line: [],
                    };
                    var objField_journal = {};

                    if (objField_transaction.custbody_drt_nc_identificador_folio) {
                        objField_journal.custbody_drt_nc_identificador_folio = objField_transaction.custbody_drt_nc_identificador_folio;
                    }
                    if (objField_transaction.custbody_drt_nc_identificador_uuid) {
                        objField_journal.custbody_drt_nc_identificador_uuid = objField_transaction.custbody_drt_nc_identificador_uuid;
                    }
                    objField_journal.custbody_drt_nc_con_je = param_objdata.id;
                    objField_journal.custbody_drt_nc_createdfrom = respuesta.data.transaccion;
                    objField_journal.custbody_drt_nc_pendiente_enviar = false;
                    objField_journal.custbody_drt_nc_num_amortizacion = 0;

                    if (objField_transaction.trandate) {
                        objField_journal.trandate = objField_transaction.trandate;
                    }

                    for (var banco in parametro.dispersion) {
                        objSublist_journal.line.push({
                            account: accountDebit,
                            debit: parametro.dispersion[banco].monto,
                            entity: objField_transaction.entity,
                            custcol_drt_nc_identificador_uuid: parametro.dispersion[banco].identificador
                        });
                        objSublist_journal.line.push({
                            account: parametro.dispersion[banco].banco,
                            credit: parametro.dispersion[banco].monto,
                            custcol_drt_nc_identificador_uuid: parametro.dispersion[banco].identificador
                        });
                    }

                    var newjournalentry = drt_cn_lib.createRecord(record.Type.JOURNAL_ENTRY, objField_journal, objSublist_journal, {});
                    if (newjournalentry.success) {
                        respuesta.data.journal = newjournalentry.data;
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