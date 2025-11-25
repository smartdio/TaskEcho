'use client'

import { useState, useCallback } from 'react'

export function useFormValidation(validationRules) {
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const validate = useCallback((fieldName, value) => {
    const rules = validationRules[fieldName]
    if (!rules) return null

    for (const rule of rules) {
      const error = rule(value)
      if (error) {
        return error
      }
    }
    return null
  }, [validationRules])

  const validateAll = useCallback((values) => {
    const newErrors = {}
    Object.keys(validationRules).forEach(fieldName => {
      const error = validate(fieldName, values[fieldName])
      if (error) {
        newErrors[fieldName] = error
      }
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [validationRules, validate])

  const handleBlur = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }))
  }, [])

  const handleChange = useCallback((fieldName, value) => {
    if (touched[fieldName]) {
      const error = validate(fieldName, value)
      setErrors(prev => ({
        ...prev,
        [fieldName]: error || undefined
      }))
    }
  }, [touched, validate])

  const setFieldError = useCallback((fieldName, error) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors({})
    setTouched({})
  }, [])

  return {
    errors,
    touched,
    validate,
    validateAll,
    handleBlur,
    handleChange,
    setFieldError,
    clearErrors
  }
}
