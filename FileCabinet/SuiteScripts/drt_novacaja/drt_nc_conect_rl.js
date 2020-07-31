/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['./drt_cn_lib.js', 'N/search'], function (drt_cn_lib, search) {
    function _get(context) {
        try {
            log.audit({
                title: 'context _get',
                details: context
            });
            var respuesta = {
                success: false,
                data: {},
                record: '',
                error: {}
            };
            switch (context.data) {
                case "status": {
                    var checkStatus = drt_cn_lib.responseYuhu(context.record);
                    respuesta = {};
                    respuesta = checkStatus;
                }
                break;

            default:
                respuesta.data.message = 'Invalid Action.';
                break;
            }

            respuesta.success = Object.keys(respuesta.data).length > 0;
        } catch (error) {
            log.audit({
                title: 'error',
                details: error
            });
            respuesta.error = error;
            if (respuesta.record) {
                drt_cn_lib.submitRecord('customrecord_drt_nc_conect', respuesta.record, {
                    custrecord_drt_nc_c_error: JSON.stringify(error)
                });
            }
        } finally {
            log.audit({
                title: 'respuesta',
                details: respuesta
            });
            return respuesta;
        }
    }

    function _post(context) {
        try {
            log.audit({
                title: 'context _post',
                details: context
            });
            var respuesta = {
                success: false,
                data: {},
                record: '',
                recordType: '',
                error: {}
            };
            var field_respuesta = '';
            var field_error = '';
            if (context.data == "update") {
                var update = drt_cn_lib.updateYuhu(context);
                respuesta = {};
                respuesta = update;

            } else {
                switch (context.recordType) {
                    case 'salesorder': {
                        respuesta.recordType = 'customrecord_drt_nc_conect';
                        field_respuesta = 'custrecord_drt_nc_c_respuesta';
                        field_error = 'custrecord_drt_nc_c_error';
                        var recordLog = drt_cn_lib.createRecord(respuesta.recordType, {
                            custrecord_drt_nc_c_context: JSON.stringify(context),
                        });
                        if (recordLog.success) {
                            respuesta.data = recordLog.data;
                            respuesta.record = recordLog.data;

                        }
                        respuesta.success = respuesta.record != '';
                    }
                    break;
                case 'invoice': {
                    respuesta.recordType = 'customrecord_drt_nc_mora';
                    field_respuesta = 'custrecord_drt_nc_m_respuesta';
                    field_error = 'custrecord_drt_nc_m_error';
                    var recordLog = drt_cn_lib.createRecord(respuesta.recordType, {
                        custrecord_drt_nc_m_context: JSON.stringify(context),
                    });
                    if (recordLog.success) {
                        respuesta.data = recordLog.data;
                        respuesta.record = recordLog.data;

                    }
                    respuesta.success = respuesta.record != '';
                }
                break;
                case 'customerpayment': {
                    respuesta.recordType = 'customrecord_drt_nc_pagos';
                    field_respuesta = 'custrecord_drt_nc_p_respuesta';
                    field_error = 'custrecord_drt_nc_p_error';
                    var recordLog = drt_cn_lib.createRecord(respuesta.recordType, {
                        custrecord_drt_nc_p_conexion: JSON.stringify(context),
                    });
                    if (recordLog.success) {
                        respuesta.data = recordLog.data;
                        respuesta.record = recordLog.data;

                    }
                    respuesta.success = respuesta.record != '';
                }
                break;
                case 'cashsale': {
                    respuesta.recordType = 'customrecord_drt_nc_pagos';
                    field_respuesta = 'custrecord_drt_nc_p_respuesta';
                    field_error = 'custrecord_drt_nc_p_error';
                    var recordLog = drt_cn_lib.createRecord(respuesta.recordType, {
                        custrecord_drt_nc_p_conexion: JSON.stringify(context),
                    });
                    if (recordLog.success) {
                        respuesta.data = recordLog.data;
                        respuesta.record = recordLog.data;

                    }
                    respuesta.success = respuesta.record != '';
                }
                break;

                default:
                    respuesta.data.message = 'Invalid Action.';
                    break;
                }
            }

        } catch (error) {
            log.audit({
                title: 'error',
                details: error
            });
            respuesta.error = error;
            if (respuesta.record && field_error) {
                var objError = {};
                objError[field_error] = JSON.stringify(error);
                drt_cn_lib.submitRecord('customrecord_drt_nc_conect', respuesta.record, objError);
            }
        } finally {
            log.audit({
                title: 'respuesta',
                details: respuesta
            });
            if (respuesta.record && field_respuesta) {
                var objRespuesta = {};
                objRespuesta[field_respuesta] = JSON.stringify(respuesta);
                drt_cn_lib.submitRecord('customrecord_drt_nc_conect', respuesta.record, objRespuesta);
            }
            return respuesta;
        }
    }


    return {
        get: _get,
        post: _post,
    }
});