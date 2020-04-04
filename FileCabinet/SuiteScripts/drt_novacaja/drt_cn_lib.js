/**
 * drt_cn_lib.js
 * @NApiVersion 2.x
 * @NModuleScope public
 */

define([
        'N/log',
        'N/search',
        'N/record'
    ],
    function (
        log,
        search,
        record
    ) {

        function searchRecord(param_type, param_filters, param_column) {
            try {
                var respuesta = {
                    success: false,
                    data: {},
                    error: {}
                };
                /*
                 param_filters=[
                    ['isinactive', search.Operator.IS, 'F']
                ];
                param_column=[
                        { name: 'name' }
                ]
                 */
                if (param_type &&
                    param_filters &&
                    param_column
                ) {

                    var result = search.create({
                        type: param_type,
                        filters: param_filters,
                        columns: param_column
                    });
                    var resultData = result.run();
                    var start = 0;
                    do {
                        var resultSet = resultData.getRange(start, start + 1000);
                        if (resultSet && resultSet.length > 0) {
                            for (var i = 0; i < resultSet.length; i++) {
                                //                            log.audit({ title: 'resultSet[' + i + ']', details: JSON.stringify(resultSet[i]) });
                                if (!respuesta.data[resultSet[i].id]) {
                                    respuesta.data[resultSet[i].id] = {
                                        id: resultSet[i].id,
                                    };
                                    for (var column in param_column) {
                                        respuesta.data[resultSet[i].id][param_column[column].name] = resultSet[i].getValue(param_column[column]) || ''
                                    }
                                }
                            }
                        }
                        start += 1000;
                    } while (resultSet && resultSet.length == 1000);
                }
                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.error({
                    title: 'error searchRecord',
                    details: JSON.stringify(error)
                });
                respuesta.error = error;
            } finally {
                log.audit({
                    title: 'respuesta searchRecord',
                    details: respuesta
                });
                return respuesta;
            }
        }

        function createRecord(param_type, param_field_value, param_obj_sublist, param_obj_subrecord) {
            try {
                var respuesta = {
                    success: false,
                    data: '',
                    error: {}
                };
                // var param_obj_sublist= {
                //     item:[
                //         {
                //             item:5,
                //             price:3,
                //         }
                //     ]
                // }
                // {
                //     addressbook:{
                //         addr1:'Calle',
                //         addr2:'Numero Interior',
                //         addr3:'Numero Exterior',
                //         zip:'Zip',
                //         addressee:'Nombre',
                //         city:'city',
                //         country:'MX',
                //         state:'HGO',
                //     }
                // }
                log.audit({
                    title: 'param_type',
                    details: JSON.stringify(param_type)
                });
                log.audit({
                    title: 'param_field_value',
                    details: JSON.stringify(param_field_value)
                });
                log.audit({
                    title: 'param_obj_sublist',
                    details: JSON.stringify(param_obj_sublist)
                });
                log.audit({
                    title: 'param_obj_subrecord',
                    details: JSON.stringify(param_obj_subrecord)
                });
                var newRecord = record.create({
                    type: param_type,
                    isDynamic: true
                });

                for (var field in param_field_value) {
                    newRecord.setValue({
                        fieldId: field,
                        value: param_field_value[field]
                    });
                }

                for (var sublist in param_obj_sublist) {
                    for (var element in param_obj_sublist[sublist]) {
                        newRecord.selectNewLine({
                            sublistId: sublist
                        });
                        for (var field in param_obj_sublist[sublist][element]) {
                            newRecord.setCurrentSublistValue({
                                sublistId: sublist,
                                fieldId: field,
                                value: param_obj_sublist[sublist][element][field]
                            });
                        }
                        newRecord.commitLine({
                            sublistId: sublist
                        });
                    }
                }

                for (var sublist in param_obj_subrecord) {
                    log.audit({
                        title: 'sublist',
                        details: JSON.stringify(sublist)
                    });
                    newRecord.selectNewLine({
                        sublistId: sublist
                    }); //addressbook
                    newRecord.setCurrentSublistValue({
                        sublistId: sublist,
                        fieldId: 'label',
                        value: 'DRT NC - Address'
                    });
                    var subrec = newRecord.getCurrentSublistSubrecord({
                        sublistId: sublist,
                        fieldId: 'addressbookaddress'
                    });
                    for (var field in param_obj_sublist[sublist]) {
                        log.audit({
                            title: 'param_obj_sublist[' + sublist + '][' + field + ']',
                            details: JSON.stringify(param_obj_sublist[sublist][field])
                        });
                        subrec.setValue({
                            fieldId: field,
                            value: param_obj_sublist[sublist][field]
                        });
                    }
                    newRecord.commitLine({
                        sublistId: sublist
                    });
                }

                respuesta.data = newRecord.save({
                    enableSourcing: false,
                    ignoreMandatoryFields: true
                }) || '';

                respuesta.success = respuesta.data != '';
            } catch (error) {
                log.error({
                    title: 'error createRecord',
                    details: JSON.stringify(error)
                });
                respuesta.error = error;
            } finally {
                log.audit({
                    title: 'respuesta createRecord',
                    details: respuesta
                });
                return respuesta;
            }
        }

        function submitRecord(param_type, param_id, param_field_value) {
            try {
                var respuesta = {
                    success: false,
                    data: '',
                    error: {}
                };
                respuesta.data = record.submitFields({
                    type: param_type,
                    id: param_id,
                    values: param_field_value,
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });


                respuesta.success = respuesta.data != '';
            } catch (error) {
                log.error({
                    title: 'error submitRecord',
                    details: JSON.stringify(error)
                });
                respuesta.error = error;
            } finally {
                log.audit({
                    title: 'respuesta submitRecord',
                    details: respuesta
                });
                return respuesta;
            }
        }

        function loadsearch(param_idsearch, param_array_data) {
            try {
                var respuesta = {
                    success: false,
                    data: {}
                }
                log.audit({
                    title: 'param_idsearch',
                    details: JSON.stringify(param_idsearch)
                });
                log.audit({
                    title: 'param_array_data',
                    details: JSON.stringify(param_array_data)
                });
                var mySearch = search.load({
                    id: param_idsearch
                });
                for (var fild in param_array_data) {
                    mySearch.columns.push(
                        search.createColumn(
                            param_array_data[fild]
                        )
                    );
                }

                log.audit({
                    title: 'mySearch.columns',
                    details: JSON.stringify(mySearch.columns)
                });
                mySearch.run().each(function (result) {
                    if (!respuesta.data[result.id]) {
                        respuesta.data[result.id] = {
                            id: result.id || ""
                        };
                    }
                    for (var fild in param_array_data) {
                        if (!param_array_data[fild].join) {
                            respuesta.data[result.id][param_array_data[fild].name] = result.getValue(
                                param_array_data[fild]
                            ) || "";
                        } else {
                            var idSub = result.getValue({
                                name: "internalid",
                                join: "inventoryNumber",
                            }) || '';
                            if (idSub) {
                                if (!respuesta.data[result.id][param_array_data[fild].join]) {
                                    respuesta.data[result.id][param_array_data[fild].join] = {}
                                }
                                if (!respuesta.data[result.id][param_array_data[fild].join][idSub]) {
                                    respuesta.data[result.id][param_array_data[fild].join][idSub] = {}
                                }

                                respuesta.data[result.id][param_array_data[fild].join][idSub][param_array_data[fild].name] = result.getValue(
                                    param_array_data[fild]
                                ) || "";
                            }

                        }

                    }
                    return true;
                });
                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.audit({
                    title: "error loadsearch",
                    details: error
                })
            } finally {
                log.audit({
                    title: 'respuesta loadsearch',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        function responseYuhu(param_id_registro) {
            try {
                log.audit({
                    title: 'param_id_registro',
                    details: JSON.stringify(param_id_registro)
                });
                var respuesta = {
                    success: false,
                    record: '',
                    error: [],
                    data: {
                        116: {
                            "record_type": "SALES_ORDER",
                            "internal_id": "116",
                            "folio": 'nombre_transaccion',
                            "total": 0,
                            "custbody_drt_nc_identificador_uuid": "",
                            "custbody_drt_nc_identificador_folio": '',
                            "trandate": '',
                            "createddate": ''
                        },
                        3: {
                            "record_type": "CUSTOMER",
                            "internal_id": "3",
                            "custentity_mx_rfc": "rfc",
                            "custentity_drt_nc_curp": "",
                        }
                    }
                };
                if (param_id_registro) {
                    respuesta.record = param_id_registro;
                } else {
                    respuesta.data = {};
                    respuesta.data.message = 'Invalid Action.';
                }

                respuesta.success = Object.keys(respuesta.data).length > 0;
            } catch (error) {
                log.error({
                    title: 'error',
                    details: JSON.stringify(error)
                });
            } finally {
                log.emergency({
                    title: 'respuesta responseYuhu',
                    details: JSON.stringify(respuesta)
                });
                return respuesta;
            }
        }

        return {
            searchRecord: searchRecord,
            createRecord: createRecord,
            submitRecord: submitRecord,
            loadsearch: loadsearch,
            responseYuhu: responseYuhu
        }
    });