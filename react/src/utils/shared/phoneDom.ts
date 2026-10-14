import $ from 'jquery';

export function animatePhoneShow() {
    $('#phone-form-react').animate({ bottom: '7%' }, 100);
    $('#phone-form-react').css({ display: 'block' });
}

export function animatePhoneHide() {
    $('#phone-form-react').animate({ bottom: '-50%' }, 100, () => {
        $('#phone-form-react').css({ display: 'none' });
    });
}

export function animatePhoneIncoming() {
    $('#phone-form-react').animate({ bottom: '-20%' }, 100);
    $('#phone-form-react').css({ display: 'block' });
}
