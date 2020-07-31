/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(['./drt_cn_lib.js', 'N/file'], function (drt_cn_lib, file) {
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
            var objCreate = {};
            var field_respuesta = '';
            var field_error = '';
            var field_context = '';
            var field_json = '';
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
                        field_context = 'custrecord_drt_nc_c_context';
                        field_json = '';
                    }
                    break;
                case 'invoice': {
                    respuesta.recordType = 'customrecord_drt_nc_mora';
                    field_respuesta = 'custrecord_drt_nc_m_respuesta';
                    field_error = 'custrecord_drt_nc_m_error';
                    field_context = 'custrecord_drt_nc_m_context';
                    field_json = '';

                }
                break;
                case 'customerpayment': {
                    respuesta.recordType = 'customrecord_drt_nc_pagos';
                    field_respuesta = 'custrecord_drt_nc_p_respuesta';
                    field_error = 'custrecord_drt_nc_p_error';
                    field_context = 'custrecord_drt_nc_p_context';
                    field_json = '';
                    if (context.record) {
                        objCreate.custrecord_drt_nc_p_conexion = context.record;
                    }
                }
                break;
                case 'cashsale': {
                    respuesta.recordType = 'customrecord_drt_nc_pagos';
                    field_respuesta = 'custrecord_drt_nc_p_respuesta';
                    field_error = 'custrecord_drt_nc_p_error';
                    field_context = 'custrecord_drt_nc_p_context';
                    field_json = '';
                    if (context.record) {
                        objCreate.custrecord_drt_nc_p_conexion = context.record;
                    }
                }
                break;

                default:
                    respuesta.data.message = 'Invalid Action.';
                    break;
                }
                if (JSON.stringify(context).length < 1000000 && field_context) {
                    objCreate[field_context] = JSON.stringify(context);

                } else if (field_json) {
                    context.custbody_drt_nc_identificador_folio
                }
                if (respuesta.recordType && Object.keys(objCreate).length > 0) {
                    var recordLog = drt_cn_lib.createRecord(respuesta.recordType, objCreate);
                    if (recordLog.success) {
                        respuesta.data = recordLog.data;
                        respuesta.record = recordLog.data;

                    }
                }
                respuesta.success = respuesta.record != '';
            }

        } catch (error) {
            log.audit({
                title: 'error',
                details: error
            });
            respuesta.error = error;
            if (respuesta.recordType && respuesta.record && field_error) {
                var objError = {};
                objError[field_error] = JSON.stringify(error);
                drt_cn_lib.submitRecord(respuesta.recordType, respuesta.record, objError);
            }
        } finally {
            log.audit({
                title: 'respuesta',
                details: respuesta
            });
            if (respuesta.recordType && respuesta.record && field_respuesta) {
                var objRespuesta = {};
                objRespuesta[field_respuesta] = JSON.stringify(respuesta);
                drt_cn_lib.submitRecord(respuesta.recordType, respuesta.record, objRespuesta);
            }
            return respuesta;
        }
    }

    function createFile(param_nombre, param_folder, param_contenido, param_tipo) {
        try {
            var respuesta = {
                success: false,
                data: ''
            };
            if (param_nombre && param_folder && param_contenido && param_tipo) {
                var fileObj = file.create({
                    name: param_nombre,
                    fileType: param_tipo,
                    contents: param_contenido
                });
                fileObj.folder = param_folder;

                respuesta.data = fileObj.save();
            }

            respuesta.success = respuesta.data != '';
        } catch (error) {
            log.error({
                title: 'error createFile',
                details: JSON.stringify(error)
            });
        } finally {
            log.emergency({
                title: 'respuesta createFile',
                details: JSON.stringify(respuesta)
            });
            return respuesta;
        }
    }

    return {
        get: _get,
        post: _post,
    }
});