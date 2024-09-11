sap.ui.define([
    "sap/m/Dialog",
    "sap/ui/unified/FileUploader",
    "sap/m/Button",
    "sap/m/MessageToast",
    "sap/ui/model/odata/v2/ODataModel"
], function(Dialog, FileUploader, Button, MessageToast, ODataModel) {
    'use strict';

    var ServiceUrl = "/sap/opu/odata/sap/ZRAP_SB_IMAGEUPLOAD/";
    var oModelData = new ODataModel(ServiceUrl, {
        useBatch: false,
        defaultUpdateMethod: "Put"
    });

    return {
        override: {
            onInit: function () {
            }
        },

        uploadimg: function () {
            if (!this._oUploadDialog) {
                this.createDialog();
            }
            this._oUploadDialog.open();
        },

        createDialog: function() {
            var oFileUploader = new FileUploader({
                id: "fileUploader",
                name: "myFileUpload",
                fileType: ["jpg", "jpeg", "png"],
                tooltip: "Upload your file to the server",
                change: this.onFileChange.bind(this)
            });

            this._oUploadDialog = new Dialog({
                title: "Upload Image",
                content: [oFileUploader],
                beginButton: new Button({
                    text: "Upload",
                    press: this.handleUploadPress.bind(this)
                }),
                endButton: new Button({
                    text: "Cancel",
                    press: function () {
                        this._oUploadDialog.close();
                        oFileUploader.clear();
                    }.bind(this)
                })
            });
        },

        onFileChange: function (oEvent) {
            var oFileUploader = oEvent.getSource();
            var oFile = oEvent.getParameter("files")[0];

            if (!oFile) {
                MessageToast.show("Please select a file.");
                return;
            }

            this._fileName = oFile.name;
            this._fileType = oFile.type;

            var reader = new FileReader();
            var that = this;

            reader.onload = function(evt) {
                that._base64Image = evt.target.result.split(",")[1];
                var oSelectedRecord = that.fetchSelectedRecord();
                if (oSelectedRecord) {
                    var sRecordId = oSelectedRecord.ImageId;
                    oModelData.read("/ZRAP_CM_ImageUpload('" + sRecordId + "')",{
                        success: function(oData){
                            // console.log(oData);
                            if (oData.ImageData) {
                                // Compare with the base64 image data
                                if (oData.ImageData === that._base64Image) {
                                    that._oUploadDialog.close();
                                    MessageToast.show("This image is already exists.");
                                    var oFileUploader = sap.ui.getCore().byId("fileUploader"); // Get the file uploader by ID
                                    if (oFileUploader) {
                                        oFileUploader.clear(); // Clear the selected file
                                    }
                                }
                            }
                        }, error: function(){
                            console.log("cannot get data");
                        }
                    });
                }
                MessageToast.show("Image converted to Base64 successfully.");
            };

            reader.onerror = function(evt) {
                MessageToast.show("Failed to read file.");
                console.error("FileReader error: ", evt);
            };

            reader.readAsDataURL(oFile);
        },

        handleUploadPress: function () {
            if (!this._base64Image) {
                MessageToast.show("Please select and wait for the file to be processed.");
                return;
            }

            var oSelectedRecord = this.fetchSelectedRecord();

            if (oSelectedRecord) {
                var sRecordId = oSelectedRecord.ImageId;
                var sImageName = oSelectedRecord.ImageName;
                
                var oPayload = {
                    ImageId: sRecordId,
                    ImageName: sImageName,
                    ImageData: this._base64Image,
                    ImageURL:`/sap/opu/odata/sap/ZRAP_SB_IMAGEUPLOAD/ZRAP_CM_ImageUpload('${sRecordId}')/ImageData/$value`,
                    MimeType: this._fileType
                };

                var sUpdatePath = "/ZRAP_CM_ImageUpload('" + sRecordId + "')";

                oModelData.update(sUpdatePath, oPayload, {
                    success: function(oData) {
                        MessageToast.show("Image uploaded and associated successfully.");
                        this.extensionAPI.refreshTable();
                        var oFileUploader = sap.ui.getCore().byId("fileUploader"); // Get the file uploader by ID
                        if (oFileUploader) {
                            oFileUploader.clear(); // Clear the selected file
                        }
                    }.bind(this),
                    error: function(oError) {
                        MessageToast.show("Failed to upload image.");
                        console.error("Update Error: ", oError);
                    }
                });
                this._oUploadDialog.close();
            } else {
                MessageToast.show("Please select a record first.");
            }
        },

        fetchSelectedRecord: function() {
            var oExtensionAPI = this.extensionAPI;
            if (oExtensionAPI) {
                var aSelectedContexts = oExtensionAPI.getSelectedContexts();
                // console.log(aSelectedContexts);
                if (aSelectedContexts && aSelectedContexts.length > 0) {
                    var oSelectedRecord = aSelectedContexts[0].getObject();
                    return oSelectedRecord;
                } else {
                    MessageToast.show("No record selected.");
                    return null;
                }
            } else {
                MessageToast.show("extensionAPI not available.");
                return null;
            }
        }
    };
});
