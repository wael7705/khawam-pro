import React from 'react'
import type { ServiceHandler } from '../serviceRegistry'

type ClothingOption = {
  id: string
  label: string
  products?: Array<{
    id: string
    name: string
    image_url?: string
    colors?: string[]
    sizes?: string[]
  }>
}

const DESIGN_LOCATIONS = [
  { id: 'logo', label: 'شعار' },
  { id: 'front', label: 'صدر' },
  { id: 'back', label: 'ظهر' },
  { id: 'shoulder_right', label: 'كتف أيمن' },
  { id: 'shoulder_left', label: 'كتف أيسر' },
]

const DEFAULT_PRODUCT_ID = 'hoodie'

export const ClothingPrintingService: ServiceHandler = {
  id: 'clothing-printing',
  name: 'الطباعة على الملابس',

  matches: (serviceName: string) => {
    const keywords = ['ملابس', 'تيشيرت', 'هودي', 'hoodie', 'clothing']
    return keywords.some(keyword => serviceName.toLowerCase().includes(keyword.toLowerCase()))
  },

  renderStep: (_stepNumber, stepType, stepConfig, serviceData, handlers) => {
    const {
      clothingSource,
      setClothingSource,
      clothingProduct,
      setClothingProduct,
      clothingColor,
      setClothingColor,
      clothingSize,
      setClothingSize,
      clothingDesigns,
      setClothingDesigns,
      uploadedFiles,
      setUploadedFiles,
      quantity,
      setQuantity,
      notes,
      setNotes,
    } = serviceData

    const { handleFileUpload } = handlers

    switch (stepType) {
      case 'clothing_source': {
        const options: ClothingOption[] = stepConfig.options || []
        const storeOption = options.find(opt => opt.id === 'store')
        const products = storeOption?.products || []
        const currentProduct = products.find(product => product.id === clothingProduct) || products[0]
        const availableColors = currentProduct?.colors || []
        const availableSizes = currentProduct?.sizes || []

        const handleSourceChange = (value: 'customer' | 'store') => {
          setClothingSource(value)
          if (value === 'store' && products.length > 0) {
            const defaultProduct = currentProduct ? currentProduct.id : products[0].id
            setClothingProduct(defaultProduct)
            const defaultColors = products.find(product => product.id === defaultProduct)?.colors || []
            if (defaultColors.length > 0) {
              setClothingColor(defaultColors[0])
            }
            const defaultSizes = products.find(product => product.id === defaultProduct)?.sizes || []
            if (defaultSizes && defaultSizes.length > 0) {
              setClothingSize(defaultSizes[0])
            }
          } else {
            setClothingSize('M')
          }
        }


        return (
          <div className="modal-body">
            <h3>{stepConfig.step_name_ar || 'مصدر الملابس'}</h3>
            {stepConfig.step_description_ar && <p className="step-description">{stepConfig.step_description_ar}</p>}

            <div className="form-group">
              <label>من أين سيتم توفير الملابس؟ <span className="required">*</span></label>
              <div className="delivery-options">
                {options.map(option => (
                  <label key={option.id} className="radio-option">
                    <input
                      type="radio"
                      value={option.id}
                      checked={clothingSource === option.id}
                      onChange={() => handleSourceChange(option.id as 'customer' | 'store')}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {clothingSource === 'store' && products.length > 0 && (
              <>
                <div className="form-group">
                  <label>اختر المنتج <span className="required">*</span></label>
                  <div className="product-grid">
                    {products.map(product => (
                      <div
                        key={product.id}
                        className={`product-card ${clothingProduct === product.id ? 'selected' : ''}`}
                        onClick={() => {
                          setClothingProduct(product.id)
                          const productColors = product.colors || []
                          if (productColors.length > 0) {
                            setClothingColor(productColors[0])
                          } else {
                            setClothingColor('')
                          }
                          const productSizes = product.sizes || []
                          if (productSizes && productSizes.length > 0) {
                            setClothingSize(productSizes[0])
                          } else {
                            setClothingSize('')
                          }
                        }}
                      >
                        <div className="product-image-wrapper">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="product-image"
                              onError={(e) => {
                                // إذا فشل تحميل الصورة، عرض placeholder
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                const placeholder = target.nextElementSibling as HTMLElement
                                if (placeholder) placeholder.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div className="product-image-placeholder" style={{ display: product.image_url ? 'none' : 'flex' }}>
                            <span>{product.name.charAt(0)}</span>
                          </div>
                          {clothingProduct === product.id && (
                            <div className="product-selected-indicator">
                              <span>✓</span>
                            </div>
                          )}
                        </div>
                        <div className="product-name">{product.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {availableColors.length > 0 && (
                  <div className="form-group">
                    <label>اختر اللون <span className="required">*</span></label>
                    <div className="delivery-options">
                      {availableColors.map(color => (
                        <label key={color} className="radio-option">
                          <input
                            type="radio"
                            value={color}
                            checked={clothingColor === color}
                            onChange={(event) => setClothingColor(event.target.value)}
                          />
                          <span>{color}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {availableSizes.length > 0 && (
                  <div className="form-group">
                    <label>اختر المقاس <span className="required">*</span></label>
                    <div className="delivery-options">
                      {availableSizes.map(size => (
                        <label key={size} className="radio-option">
                          <input
                            type="radio"
                            value={size}
                            checked={clothingSize === size}
                            onChange={(event) => setClothingSize(event.target.value)}
                          />
                          <span>{size.toUpperCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      }

      case 'clothing_designs': {
        const locations = stepConfig.locations || DESIGN_LOCATIONS
        const accept = stepConfig.accept || '.pdf,.psd,.ai,.png,.jpg,.jpeg'

        const handleFileChange = (locationId: string, files: FileList | null) => {
          const file = files && files.length > 0 ? files[0] : null
          const nextDesigns = { ...clothingDesigns, [locationId]: file }
          setClothingDesigns(nextDesigns)
          const aggregatedFiles = Object.values(nextDesigns).filter((f): f is File => !!f)
          setUploadedFiles(aggregatedFiles)
        }

        const handleRemoveFile = (locationId: string) => {
          const nextDesigns = { ...clothingDesigns, [locationId]: null }
          setClothingDesigns(nextDesigns)
          const aggregatedFiles = Object.values(nextDesigns).filter((f): f is File => !!f)
          setUploadedFiles(aggregatedFiles)
        }

        return (
          <div className="modal-body">
            <h3>{stepConfig.step_name_ar || 'رفع التصاميم'}</h3>
            {stepConfig.step_description_ar && <p className="step-description">{stepConfig.step_description_ar}</p>}

            <div className="form-group">
              <label>الكمية <span className="required">*</span></label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, parseInt(event.target.value) || 1))}
                className="form-input"
                required
              />
            </div>

            <div className="design-upload-grid">
              {locations.map((location: { id: string; label: string }) => {
                const currentFile = clothingDesigns?.[location.id] || null
                return (
                  <div key={location.id} className="form-group">
                    <label>{location.label}</label>
                    <div className="upload-area small" onClick={() => document.getElementById(`design-${location.id}`)?.click()}>
                      <input
                        id={`design-${location.id}`}
                        type="file"
                        accept={accept}
                        onChange={(event) => handleFileChange(location.id, event.target.files)}
                        className="hidden"
                      />
                      {currentFile ? (
                        <div className="uploaded-files-list">
                          <div className="uploaded-file-item">
                            <span>{currentFile.name}</span>
                            <span className="file-size">({(currentFile.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button type="button" className="btn btn-secondary" onClick={() => handleRemoveFile(location.id)}>
                            إزالة الملف
                          </button>
                        </div>
                      ) : (
                        <div className="upload-placeholder">
                          <p>اضغط لرفع التصميم</p>
                          <small>PDF, PSD, AI, PNG, JPG</small>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="form-group">
              <label>ملاحظات إضافية (اختياري)</label>
              <textarea
                value={notes || ''}
                onChange={(event) => setNotes(event.target.value)}
                className="form-input"
                placeholder="أضف أي تعليمات خاصة لكل تصميم أو ألوان الطباعة..."
                rows={4}
              />
            </div>
          </div>
        )
      }

      default:
        return null
    }
  },

  prepareOrderData: (serviceData: any, baseOrderData: any) => {
    const {
      clothingSource,
      clothingSourceLabel,
      clothingProduct,
      clothingProductLabel,
      clothingColor,
      clothingColorLabel,
      clothingSize,
      clothingSizeLabel,
      clothingDesigns,
      quantity,
      notes,
    } = serviceData

    const designEntries = Object.entries(clothingDesigns || {}).filter(([, file]) => !!file) as Array<[string, File]>
    const specifications: Record<string, any> = {
      clothing_source: clothingSourceLabel || (clothingSource === 'store' ? 'من الشركة' : 'من العميل'),
      clothing_source_value: clothingSource,
    }

    if (clothingSource === 'store') {
      specifications.clothing_product = clothingProductLabel || clothingProduct
      specifications.clothing_product_code = clothingProduct
      specifications.clothing_color = clothingColorLabel || clothingColor
      specifications.clothing_color_code = clothingColor
      if (clothingSizeLabel || clothingSize) {
        specifications.clothing_size = clothingSizeLabel || clothingSize
        specifications.clothing_size_code = clothingSize
      }
    }

    if (designEntries.length > 0) {
      specifications.design_positions = designEntries.map(([location, file]) => ({
        location,
        filename: file.name,
      }))
    }

    if (notes) {
      specifications.notes = notes
    }

    return {
      ...baseOrderData,
      items: [
        {
          service_name: baseOrderData.service_name,
          quantity: quantity || 1,
          unit_price: 0,
          total_price: 0,
          specifications,
          design_files: designEntries.map(([location, file]) => ({
            location,
            filename: file.name,
          })),
        },
      ],
    }
  },

  calculatePrice: async () => 0,

  getSpecifications: (serviceData: any) => {
    const {
      clothingSource,
      clothingSourceLabel,
      clothingProduct,
      clothingProductLabel,
      clothingColor,
      clothingColorLabel,
      clothingSize,
      clothingSizeLabel,
      clothingDesigns,
      quantity,
    } = serviceData

    const designEntries = Object.entries(clothingDesigns || {}).filter(([, file]) => !!file) as Array<[string, File]>

    return {
      clothing_source: clothingSourceLabel || (clothingSource === 'store' ? 'من الشركة' : 'من العميل'),
      clothing_source_value: clothingSource,
      clothing_product: clothingSource === 'store' ? (clothingProductLabel || clothingProduct) : undefined,
      clothing_product_code: clothingSource === 'store' ? clothingProduct : undefined,
      clothing_color: clothingSource === 'store' ? (clothingColorLabel || clothingColor) : undefined,
      clothing_color_code: clothingSource === 'store' ? clothingColor : undefined,
      clothing_size: clothingSource === 'store' ? (clothingSizeLabel || clothingSize) : undefined,
      clothing_size_code: clothingSource === 'store' ? clothingSize : undefined,
      quantity: quantity || 1,
      design_positions: designEntries.map(([location, file]) => ({
        location,
        filename: file.name,
      })),
    }
  },
}

