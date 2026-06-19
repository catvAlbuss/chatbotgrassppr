import Swal from 'sweetalert2'

export const swal = Swal.mixin({
  background: '#111827',
  color: '#f9fafb',
  confirmButtonColor: '#10b981',
  cancelButtonColor: '#374151',
  customClass: {
    popup:            'swal-dark-popup',
    title:            'swal-dark-title',
    htmlContainer:    'swal-dark-html',
    timerProgressBar: 'swal-dark-timer',
    confirmButton:    'swal-dark-confirm',
  },
})

export default swal
